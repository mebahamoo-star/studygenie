package com.studygenie.backend.service.browse;

import com.studygenie.backend.dto.ai.GeneratePlanRequest;
import com.studygenie.backend.dto.ai.PlanResponseData;
import com.studygenie.backend.dto.ai.TopicPlanInput;
import com.studygenie.backend.dto.browse.CourseDto;
import com.studygenie.backend.dto.syllabus.TopicDto;
import com.studygenie.backend.entity.College;
import com.studygenie.backend.entity.Course;
import com.studygenie.backend.entity.Student;
import com.studygenie.backend.entity.StudyPlan;
import com.studygenie.backend.entity.Topic;
import com.studygenie.backend.entity.enums.CourseStatus;
import com.studygenie.backend.exception.DuplicateResourceException;
import com.studygenie.backend.exception.ResourceNotFoundException;
import com.studygenie.backend.repository.CollegeRepository;
import com.studygenie.backend.repository.CourseRepository;
import com.studygenie.backend.repository.StudentRepository;
import com.studygenie.backend.repository.StudyPlanRepository;
import com.studygenie.backend.service.ai.StudyPlanService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final CollegeRepository collegeRepository;
    private final StudentRepository studentRepository;
    private final StudyPlanRepository studyPlanRepository;
    private final StudyPlanService studyPlanService;
    private final com.studygenie.backend.repository.TopicRepository topicRepository;

    public CourseService(CourseRepository courseRepository, CollegeRepository collegeRepository, 
                         StudentRepository studentRepository, StudyPlanRepository studyPlanRepository, 
                         StudyPlanService studyPlanService, com.studygenie.backend.repository.TopicRepository topicRepository) {
        this.topicRepository = topicRepository;
        this.courseRepository = courseRepository;
        this.collegeRepository = collegeRepository;
        this.studentRepository = studentRepository;
        this.studyPlanRepository = studyPlanRepository;
        this.studyPlanService = studyPlanService;
    }

    @Transactional(readOnly = true)
    public List<CourseDto> getCoursesByCollege(Long collegeId) {
        if (!collegeRepository.existsById(collegeId)) {
            throw new ResourceNotFoundException("College not found");
        }
        return courseRepository.findByCollegeId(collegeId).stream()
                .map(c -> new CourseDto(c.getId(), c.getName(), c.getCollege().getId(), c.getStatus()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseDto getCourse(Long courseId) {
        Course c = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        return new CourseDto(c.getId(), c.getName(), c.getCollege().getId(), c.getStatus());
    }

    @Transactional(readOnly = true)
    public List<TopicDto> getCourseTopics(Long courseId) {
        Course c = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        if (c.getStatus() == CourseStatus.NO_SYLLABUS || c.getSyllabus() == null) {
            throw new ResourceNotFoundException("Course has no syllabus yet");
        }
        if (c.getStatus() != CourseStatus.READY) {
             throw new ResourceNotFoundException("Course syllabus is not ready yet");
        }
        return topicRepository.findBySyllabusId(c.getSyllabus().getId()).stream()
                .map(t -> new TopicDto(
                        t.getChapterTitle(),
                        t.getOrderIndex(),
                        t.getEstimatedHours()))
                .collect(Collectors.toList());
    }

    @Transactional
    public CourseDto createCourse(Long collegeId, String name) {
        College college = collegeRepository.findById(collegeId)
                .orElseThrow(() -> new ResourceNotFoundException("College not found"));

        List<Course> existingCourses = courseRepository.findByCollegeId(collegeId);
        for (Course ec : existingCourses) {
            if (ec.getName().equalsIgnoreCase(name.trim())) {
                return new CourseDto(ec.getId(), ec.getName(), ec.getCollege().getId(), ec.getStatus());
            }
        }

        Course course = Course.builder()
                .name(name.trim())
                .college(college)
                .status(CourseStatus.NO_SYLLABUS)
                .build();
        
        try {
            course = courseRepository.save(course);
            courseRepository.flush(); 
        } catch (DataIntegrityViolationException e) {
            for (Course ec : courseRepository.findByCollegeId(collegeId)) {
                if (ec.getName().equalsIgnoreCase(name.trim())) {
                    return new CourseDto(ec.getId(), ec.getName(), ec.getCollege().getId(), ec.getStatus());
                }
            }
            throw new DuplicateResourceException("Course with this name already exists in this college");
        }

        return new CourseDto(course.getId(), course.getName(), course.getCollege().getId(), course.getStatus());
    }

    @Transactional
    public PlanResponseData joinChallenge(Long courseId, Long userId, LocalDate examDate, Double dailyHours, String mode) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));
        
        if (course.getStatus() == CourseStatus.NO_SYLLABUS || course.getSyllabus() == null) {
            throw new DuplicateResourceException("Course has no syllabus yet, cannot join."); // using a standard error, wait, 404/409 required.
        }
        if (course.getStatus() != CourseStatus.READY) {
             throw new DuplicateResourceException("Course syllabus is not ready yet."); // will map to 409
        }

        if (studyPlanRepository.findByStudentIdAndCourseId(userId, courseId).isPresent()) {
            throw new DuplicateResourceException("You have already joined this course and generated a plan.");
        }

        Student student = studentRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        List<TopicPlanInput> topics = topicRepository.findBySyllabusId(course.getSyllabus().getId()).stream()
                .map(t -> new TopicPlanInput(
                        String.valueOf(t.getId()),
                        t.getChapterTitle(),
                        t.getOrderIndex(),
                        t.getEstimatedHours(),
                        1 // default importance
                ))
                .collect(Collectors.toList());

        GeneratePlanRequest request = new GeneratePlanRequest(
                LocalDate.now(),
                examDate,
                topics,
                dailyHours != null ? dailyHours : 2.0,
                List.of(7), // default rest day Sunday
                mode != null ? mode : "NORMAL",
                3, // buffer
                0.2 // review ratio
        );

        PlanResponseData data = studyPlanService.generateAndSave(request);

        StudyPlan studyPlan = StudyPlan.builder()
                .student(student)
                .course(course)
                .examDate(examDate)
                .build();
        studyPlanRepository.save(studyPlan);

        return data;
    }
}


