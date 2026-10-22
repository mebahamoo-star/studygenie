import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Flame,
  GraduationCap,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { daysUntil, fetchAndSyncExams, loadExamsForUser, saveExam, type Exam } from "@/lib/exam";
import { ExamHub } from "@/components/ExamHub";
import { Card } from "@/components/AppShell";
import { Genie, type GeniePose } from "@/components/Genie";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/lib/app-state";
import { pageHead } from "@/lib/head";
import { deduplicateTopics, getUserCourses, getUserStoragePrefix, getUserTaskKits, saveUserCourses, saveUserTaskKits } from "@/lib/courses-util";
import { browseService, examService, type CommunityChallenge } from "@/lib/api/services";
import { fetchApi } from "@/lib/api/client";
import type { Course, Topic } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { ReportCourseDialog } from "@/components/ReportCourseDialog";

export const Route = createFileRoute("/_shell/dashboard")({
  head: pageHead("Dashboard", "Your daily checklist, streak and study progress."),
  component: Dashboard,
});

interface TaskItem {
  id: string;
  label: string;
  course: string;
  min: number;
  tag: string;
  description?: string;
  date: string;
  courseId?: string | number;
}

interface WeekDayInfo {
  d: string;
  n: number;
  dateStr: string;
  today: boolean;
  isPast: boolean;
  isFuture: boolean;
  formattedLabel: string;
}

interface DiscoveredPlan {
  courseName: string;
  courseCode?: string;
  courseId?: string | number;
  topics?: any[];
  tasks: any[];
}

function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekDays(): WeekDayInfo[] {
  const now = new Date();
  const todayDateStr = toLocalDateStr(now);
  const currentDay = now.getDay(); // 0 is Sunday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const days: WeekDayInfo[] = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset + i);
    const dateStr = toLocalDateStr(d);
    const isToday = dateStr === todayDateStr;
    const isPast = dateStr < todayDateStr;
    const isFuture = dateStr > todayDateStr;

    days.push({
      d: dayLabels[i],
      n: d.getDate(),
      dateStr,
      today: isToday,
      isPast,
      isFuture,
      formattedLabel: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    });
  }
  return days;
}

function getMajorSeeds(majorName: string, uni: string, col: string): CommunityChallenge[] {
  const norm = (majorName || "").toLowerCase();
  const dateIn14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const dateIn21 = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const dateIn28 = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);

  if (norm.includes("med") || norm.includes("pharm") || norm.includes("dent") || norm.includes("health")) {
    return [
      {
        id: null,
        courseName: "Human Anatomy & Physiology",
        examType: "Midterm Exam",
        examDate: dateIn14,
        professor: "Prof. Dr. Al-Mansoor",
        uploaderName: "Reem K. (4th Year)",
        universityName: uni || "Medical University",
        collegeName: col || "College of Medicine",
        hasSyllabus: true,
        chaptersCount: 7,
        peerCount: 14,
        isJoined: false,
      },
      {
        id: null,
        courseName: "Medical Biochemistry",
        examType: "Final Exam",
        examDate: dateIn21,
        professor: "Dr. Al-Husseini",
        uploaderName: "Tariq S. (Batch 2026)",
        universityName: uni || "Medical University",
        collegeName: col || "College of Medicine",
        hasSyllabus: true,
        chaptersCount: 6,
        peerCount: 9,
        isJoined: false,
      },
      {
        id: null,
        courseName: "General Pathology",
        examType: "Midterm Exam",
        examDate: dateIn28,
        professor: "Prof. Dr. Sarah Al-Najjar",
        uploaderName: "Zaid N.",
        universityName: uni || "Medical University",
        collegeName: col || "College of Medicine",
        hasSyllabus: true,
        chaptersCount: 5,
        peerCount: 12,
        isJoined: false,
      },
    ];
  }

  if (norm.includes("bus") || norm.includes("fin") || norm.includes("acc") || norm.includes("econ") || norm.includes("manage")) {
    return [
      {
        id: null,
        courseName: "Financial Accounting",
        examType: "Midterm Exam",
        examDate: dateIn14,
        professor: "Dr. Al-Ghamdi",
        uploaderName: "Hussain B. (Senior)",
        universityName: uni || "Business School",
        collegeName: col || "College of Business Administration",
        hasSyllabus: true,
        chaptersCount: 6,
        peerCount: 11,
        isJoined: false,
      },
      {
        id: null,
        courseName: "Principles of Marketing",
        examType: "Final Exam",
        examDate: dateIn21,
        professor: "Dr. Noura Al-Otaibi",
        uploaderName: "Lama M.",
        universityName: uni || "Business School",
        collegeName: col || "College of Business Administration",
        hasSyllabus: true,
        chaptersCount: 5,
        peerCount: 16,
        isJoined: false,
      },
      {
        id: null,
        courseName: "Corporate Finance",
        examType: "Midterm Exam",
        examDate: dateIn28,
        professor: "Prof. Dr. Henderson",
        uploaderName: "Fahad K.",
        universityName: uni || "Business School",
        collegeName: col || "College of Business Administration",
        hasSyllabus: true,
        chaptersCount: 6,
        peerCount: 8,
        isJoined: false,
      },
    ];
  }

  // Default / Engineering & Computer Science
  return [
    {
      id: null,
      courseName: "Data Structures & Algorithms",
      examType: "Midterm Exam",
      examDate: dateIn14,
      professor: "Prof. Dr. Miller",
      uploaderName: "Sarah K. (Honor Student)",
      universityName: uni || "University Campus",
      collegeName: col || "College of Computing",
      hasSyllabus: true,
      chaptersCount: 6,
      peerCount: 18,
      isJoined: false,
    },
    {
      id: null,
      courseName: "Operating Systems",
      examType: "Final Exam",
      examDate: dateIn21,
      professor: "Dr. Anderson",
      uploaderName: "Omar T. (Batch Lead)",
      universityName: uni || "University Campus",
      collegeName: col || "College of Computing",
      hasSyllabus: true,
      chaptersCount: 5,
      peerCount: 15,
      isJoined: false,
    },
    {
      id: null,
      courseName: "Database Systems",
      examType: "Midterm Exam",
      examDate: dateIn28,
      professor: "Prof. Dr. Al-Harbi",
      uploaderName: "Khaled W.",
      universityName: uni || "University Campus",
      collegeName: col || "College of Computing",
      hasSyllabus: true,
      chaptersCount: 5,
      peerCount: 12,
      isJoined: false,
    },
  ];
}

function getStructuredChaptersForCourse(courseName: string, major?: string): Topic[] {
  const norm = (courseName || "").toLowerCase();

  if (norm.includes("operat") || norm.includes("os")) {
    return [
      { id: 1, name: "Process Management & CPU Scheduling", durationMinutes: 120, importance: 4, subtopics: ["Process States", "Context Switching", "Round Robin & Priority", "IPC Mechanisms"] },
      { id: 2, name: "Threads & Concurrency Control", durationMinutes: 120, importance: 4, subtopics: ["User vs Kernel Threads", "Race Conditions", "Mutex & Semaphores", "Deadlocks"] },
      { id: 3, name: "Memory Management & Paging", durationMinutes: 150, importance: 5, subtopics: ["Logical vs Physical Address", "Paging Hardware", "TLB Translation", "Segmentation"] },
      { id: 4, name: "Virtual Memory & Page Replacement", durationMinutes: 150, importance: 5, subtopics: ["Demand Paging", "Page Fault Handling", "FIFO, LRU, Optimal", "Thrashing & Working Set"] },
      { id: 5, name: "File Systems, I/O & Storage", durationMinutes: 120, importance: 3, subtopics: ["Inodes & Directories", "File Allocation Tables", "Disk Scheduling Algorithms", "RAID Architectures"] },
    ];
  }

  if (norm.includes("data struct") || norm.includes("algorithm") || norm.includes("dsa")) {
    return [
      { id: 1, name: "Asymptotic Complexity & Arrays", durationMinutes: 120, importance: 4, subtopics: ["Big-O, Omega, Theta", "Amortized Analysis", "Dynamic Arrays", "Memory Locality"] },
      { id: 2, name: "Linked Lists, Stacks & Queues", durationMinutes: 120, importance: 4, subtopics: ["Singly & Doubly Linked", "LIFO vs FIFO", "Queue Applications", "Deque Structures"] },
      { id: 3, name: "Hash Tables & Collision Resolution", durationMinutes: 150, importance: 5, subtopics: ["Hash Functions", "Separate Chaining", "Open Addressing & Linear Probing", "Load Factor"] },
      { id: 4, name: "Trees & Binary Search Trees", durationMinutes: 150, importance: 5, subtopics: ["BST Properties", "In-Order Traversal", "AVL Rotations", "Search and Insert Logarithmic Bounds"] },
      { id: 5, name: "Graph Algorithms & Shortest Paths", durationMinutes: 180, importance: 5, subtopics: ["BFS & DFS Traversal", "Dijkstra's Algorithm", "Topological Sorting", "Minimum Spanning Trees"] },
      { id: 6, name: "Dynamic Programming & Greedy", durationMinutes: 180, importance: 4, subtopics: ["Memoization vs Tabulation", "0/1 Knapsack", "Interval Scheduling", "Optimal Substructure"] },
    ];
  }

  if (norm.includes("datab") || norm.includes("sql")) {
    return [
      { id: 1, name: "Relational Model & Relational Algebra", durationMinutes: 120, importance: 4, subtopics: ["Relations & Tuples", "Selection & Projection", "Natural & Theta Joins", "Integrity Constraints"] },
      { id: 2, name: "SQL Querying & Aggregations", durationMinutes: 120, importance: 5, subtopics: ["Group By & Having", "Subqueries & Exists", "Window Functions", "Views & CTEs"] },
      { id: 3, name: "Schema Normalization (1NF to BCNF)", durationMinutes: 150, importance: 5, subtopics: ["Functional Dependencies", "Lossless Join Decomposition", "Dependency Preservation", "Boyce-Codd Normal Form"] },
      { id: 4, name: "Transactions & Concurrency Control", durationMinutes: 150, importance: 5, subtopics: ["ACID Properties", "Two-Phase Locking (2PL)", "Schedules & Serializability", "Deadlock Detection"] },
      { id: 5, name: "Indexing & Query Optimization", durationMinutes: 120, importance: 4, subtopics: ["B+ Tree Indexes", "Hash Indexes", "Execution Plans", "Cost-Based Query Planning"] },
    ];
  }

  // General 5-chapter academic template
  return [
    { id: 1, name: "Foundational Concepts & Principles", durationMinutes: 120, importance: 4, subtopics: ["Core Terminology", "Governing Theories", "Standard Frameworks"] },
    { id: 2, name: "Core Mechanisms & Methodologies", durationMinutes: 150, importance: 5, subtopics: ["Structural Workflows", "Operational Laws", "Step-by-Step Procedures"] },
    { id: 3, name: "Analytical Problem Solving", durationMinutes: 150, importance: 5, subtopics: ["Formula Applications", "Case Studies", "Quantitative Modeling"] },
    { id: 4, name: "Advanced Scenarios & Comparative Analysis", durationMinutes: 120, importance: 4, subtopics: ["Differential Criteria", "Edge Cases", "Trade-Off Analysis"] },
    { id: 5, name: "Comprehensive Exam Review & Synthesis", durationMinutes: 120, importance: 5, subtopics: ["High-Yield Summaries", "Common Exam Traps", "Integrated Mastery"] },
  ];
}

function generateNotebookLMFlashcards(courseName: string, topics: Topic[]) {
  return [
    {
      id: `fc-1-${Date.now()}`,
      q: `What is the core definition and foundational principle of ${topics[0]?.name || courseName}?`,
      a: `It establishes the fundamental theoretical framework and structural constraints governing all subsequent mechanisms in ${courseName}.`,
      chapter: topics[0]?.name || "Core Foundations",
    },
    {
      id: `fc-2-${Date.now()}`,
      q: `How does the primary mechanism in ${topics[1]?.name || "Core Mechanisms"} operate?`,
      a: `It executes step-by-step state transitions while preserving system invariants and ensuring deterministic, reproducible outcomes.`,
      chapter: topics[1]?.name || "Mechanisms",
    },
    {
      id: `fc-3-${Date.now()}`,
      q: `What is the primary constraint or rate-limiting factor in ${topics[2]?.name || "Analysis"}?`,
      a: `Resource contention and boundary conditions limit throughput, requiring balanced allocation or logarithmic optimization strategies.`,
      chapter: topics[2]?.name || "Problem Solving",
    },
    {
      id: `fc-4-${Date.now()}`,
      q: `How do the trade-offs differ between standard approaches and optimized models in ${courseName}?`,
      a: `Standard models prioritize simplicity and baseline latency, whereas optimized variants sacrifice space to guarantee worst-case logarithmic efficiency.`,
      chapter: topics[3]?.name || "Advanced Concepts",
    },
    {
      id: `fc-5-${Date.now()}`,
      q: `What critical rule must be verified to prevent failure or degraded performance in ${courseName}?`,
      a: `Always maintain invariant integrity across boundary cases and adhere strictly to transactional concurrency guarantees.`,
      chapter: topics[4]?.name || "Exam Synthesis",
    },
  ];
}

function generateExamQuizzes(courseName: string, topics: Topic[]) {
  return [
    {
      id: `qz-1-${Date.now()}`,
      q: `Which principle is fundamental to mastering ${topics[0]?.name || courseName}?`,
      options: [
        "Adhering to core invariant properties and structural constraints",
        "Ignoring boundary conditions during initial execution",
        "Linear degradation across all operational workflows",
        "Assuming infinite memory and zero communication overhead",
      ],
      correct: 0,
      explanation: `Maintaining structural invariants ensures predictable, correct execution across all system states.`,
    },
    {
      id: `qz-2-${Date.now()}`,
      q: `What is the primary objective of ${topics[1]?.name || "Core Workflows"}?`,
      options: [
        "Increasing redundant computations arbitrarily",
        "Maximizing throughput while maintaining consistency guarantees",
        "Bypassing synchronization mechanisms in concurrent threads",
        "Eliminating all data structures from memory",
      ],
      correct: 1,
      explanation: `System designs focus on maximizing throughput within safe consistency boundaries.`,
    },
    {
      id: `qz-3-${Date.now()}`,
      q: `Under which condition does standard performance degrade in ${courseName}?`,
      options: [
        "When data distribution is perfectly balanced",
        "When pathological or sorted edge cases cause unmitigated imbalance",
        "When logarithmic index structures are properly utilized",
        "When cached results satisfy all lookups",
      ],
      correct: 1,
      explanation: `Unbalanced inputs degrade tree and list lookups from logarithmic time to linear worst-case time.`,
    },
    {
      id: `qz-4-${Date.now()}`,
      q: `Why is active recall and spaced repetition recommended for ${courseName}?`,
      options: [
        "It eliminates the need to review before finals",
        "It strengthens neural retrieval pathways and long-term retention",
        "It only works for multiple choice tests",
        "It replaces understanding underlying mechanisms",
      ],
      correct: 1,
      explanation: `Active retrieval stimulates deeper memory encoding compared to passive re-reading.`,
    },
  ];
}

function Dashboard() {
  const nav = useNavigate();
  const { user } = useApp();
  const todayStr = toLocalDateStr(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [discoveredPlans, setDiscoveredPlans] = useState<DiscoveredPlan[]>([]);
  const [fallbackTasks, setFallbackTasks] = useState<TaskItem[]>([]);
  const [doneMap, setDoneMap] = useState<Record<string, string[]>>({});
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [courseName, setCourseName] = useState<string>("No active course");
  const [hasPlans, setHasPlans] = useState<boolean | null>(null);
  const [checklistDateLabel, setChecklistDateLabel] = useState<string>("Today");
  const [enrolledCount, setEnrolledCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [currentExamIndex, setCurrentExamIndex] = useState(0);

  // Community challenges state
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState<boolean>(true);
  const [reportDialogOpen, setReportDialogOpen] = useState<boolean>(false);
  const [reportingCourse, setReportingCourse] = useState<{ name: string; id?: number | string | null }>({ name: "" });
  const [joiningCourse, setJoiningCourse] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);
  const [joinedResult, setJoinedResult] = useState<{
    courseName: string;
    examType: string;
    examDate: string;
    chaptersCount: number;
    planDays: number;
    cardsCount: number;
    quizCount: number;
  } | null>(null);

  const [campusInfo, setCampusInfo] = useState<{
    uni: string;
    col: string;
    major: string;
    colId?: number | string;
  }>({
    uni: "",
    col: "",
    major: "",
  });

  const loadChallenges = async (currentEnrolledCourses: Course[], currentExams: Exam[]) => {
    setLoadingChallenges(true);
    let uniName = "";
    let colName = "";
    let majorName = "";
    let collegeId: number | string | undefined = undefined;

    try {
      const savedUni = localStorage.getItem("sg-user-uni");
      if (savedUni) {
        const parsed = JSON.parse(savedUni);
        uniName = parsed.name || "";
      }
      const savedCol = localStorage.getItem("sg-user-col");
      if (savedCol) {
        const parsed = JSON.parse(savedCol);
        colName = parsed.name || "";
        collegeId = parsed.id;
      }
      const savedMajor = localStorage.getItem("sg-user-major");
      if (savedMajor) {
        const parsed = JSON.parse(savedMajor);
        majorName = parsed.name || "";
      }
    } catch {}

    setCampusInfo({
      uni: uniName || "Your University",
      col: colName || "Your College",
      major: majorName || "Your Major",
      colId: collegeId,
    });

    const enrolledNames = new Set(currentEnrolledCourses.map((c) => c.name.toLowerCase().trim()));
    const examCourseNames = new Set(currentExams.map((e) => e.course.toLowerCase().trim()));

    try {
      // 1. Fetch remote community challenges from backend
      const remote = await examService.getCommunityChallenges(collegeId);

      // 2. Fetch college catalog courses
      let catalogCourses: Course[] = [];
      if (collegeId) {
        try {
          catalogCourses = await browseService.getAllCourses(collegeId);
        } catch {}
      }

      // 3. Fallback/seed major challenges
      const fallbackChallenges = getMajorSeeds(majorName, uniName, colName);

      const map = new Map<string, CommunityChallenge>();

      // Populate from remote
      remote.forEach((item) => {
        const key = item.courseName.toLowerCase().trim();
        const isJoined = enrolledNames.has(key) || examCourseNames.has(key);
        map.set(key, { ...item, isJoined });
      });

      // Populate from catalog courses that have syllabus
      catalogCourses.forEach((c) => {
        const key = c.name.toLowerCase().trim();
        if (!map.has(key)) {
          const isJoined = enrolledNames.has(key) || examCourseNames.has(key);
          const hasSyllabus = c.status === "ready" || (c.topics && c.topics.length > 0);
          const chaptersCount = c.topics?.length || (hasSyllabus ? 5 : 0);
          map.set(key, {
            id: null,
            courseId: typeof c.id === "number" ? c.id : null,
            courseName: c.name,
            examType: "Midterm Exam",
            examDate: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
            professor: "Department Faculty",
            uploaderName: "Campus Classmates",
            universityName: uniName || "University",
            collegeName: colName || "College",
            hasSyllabus: !!hasSyllabus,
            chaptersCount,
            peerCount: 3,
            isJoined,
          });
        }
      });

      // Populate seed challenges
      fallbackChallenges.forEach((item) => {
        const key = item.courseName.toLowerCase().trim();
        if (!map.has(key)) {
          const isJoined = enrolledNames.has(key) || examCourseNames.has(key);
          map.set(key, { ...item, isJoined });
        }
      });

      const list = Array.from(map.values());
      // Sort: unjoined challenges first, then by date
      list.sort((a, b) => {
        if (a.isJoined !== b.isJoined) {
          return a.isJoined ? 1 : -1;
        }
        return new Date(a.examDate).getTime() - new Date(b.examDate).getTime();
      });

      setChallenges(list);
    } catch (err) {
      console.warn("Could not load community challenges:", err);
    } finally {
      setLoadingChallenges(false);
    }
  };

  const handleJoinChallenge = async (ch: CommunityChallenge) => {
    setJoiningCourse(ch.courseName);
    const prefix = getUserStoragePrefix();
    const todayStr = new Date().toISOString().slice(0, 10);

    try {
      // 1. Get or generate syllabus topics for this course
      let topics: Topic[] = [];
      if (ch.courseId) {
        try {
          const remoteTopics = await browseService.getCourseTopics(ch.courseId);
          if (remoteTopics && remoteTopics.length > 0) {
            topics = remoteTopics;
          }
        } catch {}
      }

      if (topics.length === 0) {
        topics = getStructuredChaptersForCourse(ch.courseName, campusInfo.major);
      }
      topics = deduplicateTopics(topics);

      // 2. Ensure course in local list and enrolled in backend
      const enrolled = getUserCourses();
      let courseObj = enrolled.find((c) => c.name.toLowerCase() === ch.courseName.toLowerCase());
      if (!courseObj) {
        courseObj = {
          id: ch.courseId || `c-${Date.now()}`,
          name: ch.courseName,
          code: "",
          status: "ready",
          topics,
        };
      } else {
        const mergedTopics = deduplicateTopics([...(courseObj.topics || []), ...topics]);
        courseObj = {
          ...courseObj,
          status: "ready",
          topics: mergedTopics.length > 0 ? mergedTopics : courseObj.topics || [],
        };
      }

      const nextEnrolled = [courseObj, ...enrolled.filter((c) => c.name.toLowerCase() !== ch.courseName.toLowerCase())];
      saveUserCourses(nextEnrolled);
      localStorage.setItem("sg-active-course", JSON.stringify(courseObj));

      // Enroll in backend
      if (ch.courseId) {
        await browseService.enrollCourse(ch.courseId).catch(() => {});
      } else {
        await browseService.syncEnrolledCourses([ch.courseName]).catch(() => {});
      }

      // 3. Create upcoming Exam
      const examDateStr = ch.examDate;
      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        course: ch.courseName,
        type: ch.examType,
        date: examDateStr,
        professor: ch.professor || "",
      };
      saveExam(newExam);
      try {
        await examService.createExam({
          course: ch.courseName,
          type: ch.examType,
          date: examDateStr,
          professor: ch.professor,
        });
      } catch {}

      // Refresh exams on dashboard
      const updatedExams = await fetchAndSyncExams();
      setExams(updatedExams);
      setCurrentExamIndex(0);

      // 4. Generate day-by-day study plan
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const targetExam = new Date(examDateStr);
      targetExam.setHours(0, 0, 0, 0);
      const daysUntilExam = Math.max(1, Math.ceil((targetExam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const bufferDays = daysUntilExam <= 3 ? 0 : daysUntilExam <= 7 ? 1 : 2;

      const topicsPayload = topics.map((t, idx) => ({
        ref: String(t.id || idx + 1),
        topicRef: String(t.id || idx + 1),
        topic_ref: String(t.id || idx + 1),
        chapterTitle: t.name,
        chapter_title: t.name,
        orderIndex: idx + 1,
        order_index: idx + 1,
        estimatedHours: Math.max(0.5, (t.durationMinutes || 120) / 60),
        estimated_hours: Math.max(0.5, (t.durationMinutes || 120) / 60),
        importance: t.importance || 3,
        subtopics: t.subtopics || [],
      }));

      let planData: any = null;
      try {
        const res = await fetchApi<any>("/api/v1/study-plans/generate", {
          method: "POST",
          body: JSON.stringify({
            startDate: todayStr,
            start_date: todayStr,
            examDate: examDateStr,
            exam_date: examDateStr,
            topics: topicsPayload,
            dailyHours: 2.5,
            daily_hours: 2.5,
            restDays: [6],
            rest_weekdays: [6],
            mode: "NORMAL",
            bufferDays,
            buffer_days_before_exam: bufferDays,
            reviewRatio: 0.2,
            review_ratio: 0.2,
          }),
        });
        planData = res.data;
      } catch (e) {
        console.warn("Could not generate plan via backend, building structured fallback plan:", e);
      }

      if (!planData || !planData.tasks) {
        const tasksGenerated = topics.map((t, idx) => ({
          id: `task-${Date.now()}-${idx}`,
          title: `Master ${t.name}`,
          description: `Study key concepts and review active recall flashcards`,
          estimated_minutes: 60,
          order_index: idx + 1,
          topic_ref: String(t.id || idx + 1),
          date: todayStr,
        }));
        planData = { tasks: tasksGenerated };
      }

      localStorage.setItem("sg-active-plan", JSON.stringify(planData));

      // 5. Generate NotebookLM-style active recall flashcards and quiz questions
      const flashcards = generateNotebookLMFlashcards(ch.courseName, topics);
      const quizQuestions = generateExamQuizzes(ch.courseName, topics);

      localStorage.setItem(`sg-${prefix}-active-cards`, JSON.stringify(flashcards));
      localStorage.setItem("sg-active-cards", JSON.stringify(flashcards));
      localStorage.setItem("sg-active-quiz", JSON.stringify(quizQuestions));

      const kits = getUserTaskKits();
      kits[ch.courseName.toLowerCase().trim()] = {
        kitId: `kit-${Date.now()}`,
        flashcards,
        quiz: quizQuestions,
      };
      saveUserTaskKits(kits);

      // 6. Update dashboard state
      setChallenges((prev) =>
        prev.map((item) =>
          item.courseName.toLowerCase().trim() === ch.courseName.toLowerCase().trim()
            ? { ...item, isJoined: true }
            : item
        )
      );

      setCourseName(ch.courseName);
      setHasPlans(true);
      if (planData.tasks && planData.tasks.length > 0) {
        const firstDayTasks: TaskItem[] = planData.tasks.slice(0, 3).map((t: any, idx: number) => ({
          id: String(t.id || `plan-task-${idx}`),
          label: t.title || t.name || `Study Chapter ${idx + 1}`,
          course: ch.courseName,
          min: t.estimated_minutes || t.durationMinutes || 45,
          tag: "Syllabus Core",
          description: t.description || "",
          date: todayStr,
          courseId: courseObj.id,
        }));
        setTasks(firstDayTasks);
      }

      // 7. Show success celebration modal
      setJoinedResult({
        courseName: ch.courseName,
        examType: ch.examType,
        examDate: examDateStr,
        chaptersCount: topics.length,
        planDays: daysUntilExam,
        cardsCount: flashcards.length,
        quizCount: quizQuestions.length,
      });
      setSuccessModalOpen(true);
      toast.success(`Joined "${ch.courseName}" challenge! Syllabus, plan, cards & quizzes ready ✨`);
    } catch (err: any) {
      console.error("Error joining challenge:", err);
      toast.error(err?.message || "Failed to join challenge.");
    } finally {
      setJoiningCourse(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      const prefix = getUserStoragePrefix();
      const todayStr = new Date().toISOString().slice(0, 10);
      const doneKey = `sg-${prefix}-checklist-done-${todayStr}`;

      // Load saved done checkboxes for today
      let savedDone: string[] = [];
      try {
        const rawDone = localStorage.getItem(doneKey);
        if (rawDone) savedDone = JSON.parse(rawDone);
      } catch {}
      if (isMounted) setDone(savedDone);

      // 1. Fetch user enrolled courses from Neon cloud database
      let enrolled: Course[] = [];
      try {
        const remote = await browseService.getEnrolledCourses();
        enrolled = remote || [];
        saveUserCourses(enrolled);
      } catch {
        enrolled = getUserCourses();
      }

      if (!isMounted) return;
      setEnrolledCount(enrolled.length);

      // 2. Load and sync user exams
      const validExams = await fetchAndSyncExams();
      if (!isMounted) return;
      setExams(validExams);
      setCurrentExamIndex(0);

      // Always load campus challenges for the space down the dashboard
      await loadChallenges(enrolled, validExams);

      // 3. If user has no courses enrolled, set course display and exit tasks setup
      if (enrolled.length === 0) {
        setCourseName(validExams.length > 0 ? validExams[0].course : "No active course");
        setHasPlans(false);
        setTasks([]);
        setProgress(0);
        return;
      }

      // 4. Determine active course
      const activeCourseRaw =
        localStorage.getItem(`sg-${prefix}-active-course`) ||
        localStorage.getItem("sg-active-course");
      let activeCourse: Course | null = null;
      if (activeCourseRaw) {
        try {
          const parsed = JSON.parse(activeCourseRaw);
          if (enrolled.some((c) => c.name.toLowerCase() === parsed.name?.toLowerCase())) {
            activeCourse = parsed;
          }
        } catch {}
      }

      if (!activeCourse) {
        activeCourse = enrolled[0];
      }

      const displayName = activeCourse.code && activeCourse.code.toUpperCase() !== "CUSTOM"
        ? `${activeCourse.code} · ${activeCourse.name}`
        : activeCourse.name;
      setCourseName(displayName);

      // 5. Discover plans across all enrolled courses and local storage
      const allPlans: DiscoveredPlan[] = [];

      for (const c of enrolled) {
        const raw =
          localStorage.getItem(`sg-${prefix}-plan-${c.name}`) ||
          localStorage.getItem(`sg-plan-${c.name}`) ||
          localStorage.getItem(`sg-${prefix}-plan-${c.id}`) ||
          localStorage.getItem(`sg-plan-${c.id}`);

        let planData: any = null;
        if (raw) {
          try {
            planData = JSON.parse(raw);
          } catch {}
        }

        if (planData?.tasks && planData.tasks.length > 0) {
          allPlans.push({
            courseName: c.name,
            courseCode: c.code && c.code.toUpperCase() !== "CUSTOM" ? c.code : undefined,
            courseId: c.id,
            topics: c.topics,
            tasks: planData.tasks,
          });
        }
      }

      // Also check global active plan
      try {
        const activeRaw =
          localStorage.getItem(`sg-${prefix}-active-plan`) ||
          localStorage.getItem("sg-active-plan");
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          if (parsed?.tasks && parsed.tasks.length > 0) {
            const alreadyIn = allPlans.some((p) => p.tasks.length === parsed.tasks.length);
            if (!alreadyIn) {
              allPlans.push({
                courseName: activeCourse?.name || "General Course",
                courseCode: activeCourse?.code && activeCourse.code.toUpperCase() !== "CUSTOM" ? activeCourse.code : undefined,
                courseId: activeCourse?.id,
                topics: activeCourse?.topics,
                tasks: parsed.tasks,
              });
            }
          }
        }
      } catch {}

      setDiscoveredPlans(allPlans);

      // Load done IDs for all 7 days of this week
      const currentWeekDays = getWeekDays();
      const loadedDoneMap: Record<string, string[]> = {};
      currentWeekDays.forEach((w) => {
        const raw = localStorage.getItem(`sg-${prefix}-checklist-done-${w.dateStr}`);
        if (raw) {
          try {
            loadedDoneMap[w.dateStr] = JSON.parse(raw);
          } catch {}
        } else if (w.today) {
          const legacy = localStorage.getItem(`sg-${prefix}-checklist-done`);
          if (legacy) {
            try {
              loadedDoneMap[w.dateStr] = JSON.parse(legacy);
            } catch {}
          }
        }
      });
      setDoneMap(loadedDoneMap);

      if (allPlans.length === 0) {
        setHasPlans(false);
        setTasks([]);
        setProgress(0);
        return;
      }

      setHasPlans(true);

      // 6. Aggregate checklist tasks for today
      let aggregatedTasks: TaskItem[] = [];
      let foundDateLabel = "Today";

      allPlans.forEach((plan) => {
        const todayTasks = plan.tasks.filter((t: any) => t.date === todayStr);
        todayTasks.forEach((t: any) => {
          aggregatedTasks.push({
            id: String(t.id),
            label: t.title || t.name || "Study Task",
            course: plan.courseName,
            min: t.estimated_minutes || t.durationMinutes || 45,
            tag: t.is_review ? "Review" : "Core Topic",
            description: t.description || "",
            date: t.date || todayStr,
            courseId: plan.courseId,
          });
        });
      });

      // If no tasks scheduled for today, look for upcoming tasks
      if (aggregatedTasks.length === 0) {
        let nearestFutureDate: string | null = null;
        allPlans.forEach((plan) => {
          plan.tasks.forEach((t: any) => {
            if (t.date && t.date >= todayStr) {
              if (!nearestFutureDate || t.date < nearestFutureDate) {
                nearestFutureDate = t.date;
              }
            }
          });
        });

        if (nearestFutureDate) {
          foundDateLabel = nearestFutureDate;
          allPlans.forEach((plan) => {
            const nearTasks = plan.tasks.filter((t: any) => t.date === nearestFutureDate);
            nearTasks.forEach((t: any) => {
              aggregatedTasks.push({
                id: String(t.id),
                label: t.title || t.name || "Study Task",
                course: plan.courseName,
                min: t.estimated_minutes || t.durationMinutes || 45,
                tag: t.is_review ? "Review" : "Core Topic",
                description: t.description || "",
                date: t.date,
                courseId: plan.courseId,
              });
            });
          });
        } else {
          // Fallback: pick the first available tasks
          foundDateLabel = "Upcoming";
          allPlans.forEach((plan) => {
            plan.tasks.slice(0, 2).forEach((t: any) => {
              aggregatedTasks.push({
                id: String(t.id),
                label: t.title || t.name || "Study Task",
                course: plan.courseName,
                min: t.estimated_minutes || t.durationMinutes || 45,
                tag: t.is_review ? "Review" : "Core Topic",
                description: t.description || "",
                date: t.date || todayStr,
                courseId: plan.courseId,
              });
            });
          });
        }
      }

      setChecklistDateLabel(foundDateLabel);
      setTasks(aggregatedTasks);

      // Compute progress
      if (aggregatedTasks.length > 0) {
        const completedCount = aggregatedTasks.filter((t) => savedDone.includes(t.id)).length;
        setProgress(Math.round((completedCount / aggregatedTasks.length) * 100));
      } else {
        setProgress(0);
      }
    };

    loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  const getTasksForDate = (targetDateStr: string, plans: DiscoveredPlan[] = discoveredPlans): TaskItem[] => {
    const list: TaskItem[] = [];
    plans.forEach((plan) => {
      const matching = (plan.tasks || []).filter((t: any) => t.date === targetDateStr);
      matching.forEach((t: any) => {
        list.push({
          id: String(t.id),
          label: t.title || t.name || "Study Task",
          course: plan.courseName,
          min: t.estimated_minutes || t.durationMinutes || 45,
          tag: t.is_review ? "Review" : "Core Topic",
          description: t.description || "",
          date: t.date || targetDateStr,
          courseId: plan.courseId,
        });
      });
    });

    if (list.length === 0 && targetDateStr === todayStr && tasks.length > 0) {
      return tasks;
    }

    return list;
  };

  const getDayStats = (dateStr: string, isPast: boolean) => {
    const dayTasks = getTasksForDate(dateStr);
    const dayDone = doneMap[dateStr] || (dateStr === todayStr ? done : []);
    const completed = dayTasks.filter((t) => dayDone.includes(t.id)).length;
    const total = dayTasks.length;
    let percent = 0;
    if (total > 0) {
      percent = Math.round((completed / total) * 100);
    } else if (isPast) {
      percent = 100;
    }
    const completedMinutes = dayTasks.filter((t) => dayDone.includes(t.id)).reduce((acc, t) => acc + t.min, 0);
    const totalMinutes = dayTasks.reduce((acc, t) => acc + t.min, 0);

    return {
      tasks: dayTasks,
      done: dayDone,
      completed,
      total,
      percent,
      completedMinutes,
      totalMinutes,
      studiedHours: completedMinutes > 0 ? `${(completedMinutes / 60).toFixed(1)}h` : totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)}h` : "0h",
    };
  };

  const toggleTask = (taskId: string, targetDateStr?: string) => {
    const prefix = getUserStoragePrefix();
    const dateToUse = targetDateStr || selectedDateStr;
    const doneKey = `sg-${prefix}-checklist-done-${dateToUse}`;

    const currentList = doneMap[dateToUse] || (dateToUse === todayStr ? done : []);
    const isDone = currentList.includes(taskId);
    const nextList = isDone ? currentList.filter((id) => id !== taskId) : [...currentList, taskId];

    setDoneMap((prev) => ({
      ...prev,
      [dateToUse]: nextList,
    }));

    if (dateToUse === todayStr) {
      setDone(nextList);
    }

    try {
      localStorage.setItem(doneKey, JSON.stringify(nextList));
      if (dateToUse === todayStr) {
        localStorage.setItem(`sg-${prefix}-checklist-done`, JSON.stringify(nextList));
      }
    } catch {}
  };

  const week = getWeekDays();
  const selectedDayInfo = week.find((w) => w.dateStr === selectedDateStr) || {
    d: "Day",
    n: new Date().getDate(),
    dateStr: selectedDateStr,
    today: selectedDateStr === todayStr,
    isPast: selectedDateStr < todayStr,
    isFuture: selectedDateStr > todayStr,
    formattedLabel: selectedDateStr,
  };

  const selectedDayStats = getDayStats(selectedDateStr, selectedDayInfo.isPast);
  const activeChecklistTasks = selectedDayStats.tasks;
  const activeChecklistDone = selectedDayStats.done;

  const todayStats = getDayStats(todayStr, false);
  const displayProgress = selectedDayInfo.today ? todayStats.percent : selectedDayStats.percent;

  const pose: GeniePose = displayProgress < 34 ? "low" : displayProgress < 67 ? "mid" : "high";
  const line =
    displayProgress === 0
      ? "Welcome! Add your courses or exams to start your learning journey."
      : {
          low: "Let's get going — one step at a time!",
          mid: "Nice pace! Keep that streak alive.",
          high: "Incredible! Your wish is almost granted.",
        }[pose];

  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "Scholar";
  const activeExam = exams.length > 0 ? exams[Math.min(currentExamIndex, exams.length - 1)] : null;
  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {exams.length > 0 && activeExam ? (
        <div className="lg:col-span-3 flex flex-col gap-3">
          {/* Header controls for scrolling between exams and adding more */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-primary uppercase">
                Upcoming Exams
              </span>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                {exams.length} {exams.length === 1 ? "exam" : "exams"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {exams.length > 1 && (
                <div className="flex items-center gap-1.5 rounded-xl border bg-card p-1 shadow-soft">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setCurrentExamIndex((prev) => (prev > 0 ? prev - 1 : exams.length - 1))
                    }
                    title="Previous exam"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-semibold px-1 min-w-[3.5rem] text-center">
                    {currentExamIndex + 1} of {exams.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setCurrentExamIndex((prev) => (prev < exams.length - 1 ? prev + 1 : 0))
                    }
                    title="Next exam"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 rounded-xl">
                <Link to="/exam-checkin">
                  <Plus className="h-3.5 w-3.5" /> Add Exam
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick horizontal scrollable exam selector tabs */}
          {exams.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {exams.map((ex, idx) => {
                const days = daysUntil(ex.date);
                const active = idx === currentExamIndex;
                return (
                  <button
                    key={ex.id || idx}
                    type="button"
                    onClick={() => setCurrentExamIndex(idx)}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-soft"
                        : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <span className="font-bold">{ex.course}</span>
                    <span className="opacity-80">({ex.type})</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {days > 0 ? `${days}d` : "Today"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <ExamHub
            key={activeExam.id || activeExam.course}
            exam={activeExam}
            onRemove={async () => {
              const fresh = await fetchAndSyncExams();
              setExams(fresh);
              setCurrentExamIndex(0);
            }}
          />
        </div>
      ) : (
        <Card className="lg:col-span-3 border-dashed bg-card/60 p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold">No upcoming exams scheduled</h3>
                <p className="text-xs text-muted-foreground">
                  Add your exam dates to get automated day-by-day countdowns, study plans, and spaced review kits.
                </p>
              </div>
            </div>
            <Button variant="magic" size="sm" asChild className="gap-1.5 rounded-xl shrink-0">
              <Link to="/exam-checkin">
                <Plus className="h-4 w-4" /> Add Exam Date
              </Link>
            </Button>
          </div>
        </Card>
      )}

      <Card className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Genie pose={pose} className="h-20 w-20 shrink-0" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                {todayDateStr}
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Welcome back, {firstName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{line}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing value={progress} size={84} strokeWidth={8} />
          </div>
        </div>
      </Card>

      <Card className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daily Streak
            </span>
            <span className="text-2xl">🔥</span>
          </div>
          <div className="mt-2 font-display text-4xl font-bold text-foreground">
            {user?.streakCount ?? 3}{" "}
            <span className="text-base font-normal text-muted-foreground">days</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Complete today&apos;s active recall quest to keep the genie powerful!
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs">
          <span className="text-muted-foreground">Genie Points</span>
          <span className="font-display font-semibold text-gold">
            ⭐ {user?.geniePoints ?? 340} pts
          </span>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                {selectedDayInfo.today ? "Today's Checklist" : `${selectedDayInfo.formattedLabel} Checklist`}
              </h2>
              {selectedDayInfo.today && checklistDateLabel !== "Today" && (
                <span className="rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Scheduled for {checklistDateLabel}
                </span>
              )}
              {!selectedDayInfo.today && (
                <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold border border-primary/20">
                  {selectedDayInfo.d} Schedule
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasPlans && activeChecklistTasks.length > 0
                ? `Active courses: ${courseName}`
                : "Personalized tasks appear here once you generate a study plan."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!selectedDayInfo.today && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDateStr(todayStr)}
                className="gap-1 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
              >
                Today ↩
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="gap-1 text-xs font-semibold"
            >
              <Pencil className="h-3.5 w-3.5" /> Adjust
            </Button>
            {hasPlans && (
              <Button size="sm" variant="secondary" asChild className="text-xs font-semibold">
                <Link to="/plan">View Full Plan</Link>
              </Button>
            )}
          </div>
        </div>

        {activeChecklistTasks.length > 0 ? (
          <div className="space-y-2">
            {activeChecklistTasks.map((task) => {
              const isDone = activeChecklistDone.includes(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id, selectedDateStr)}
                  className={cn(
                    "group flex cursor-pointer items-start justify-between rounded-xl border p-3.5 transition",
                    isDone
                      ? "border-transparent bg-muted/40 text-muted-foreground opacity-60"
                      : "border-border/60 bg-card hover:border-primary/50 hover:shadow-soft"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label="Toggle task"
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                        isDone
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-muted-foreground/30 hover:border-primary"
                      )}
                    >
                      {isDone && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <div>
                      <div className={cn("text-sm font-semibold", isDone && "line-through")}>
                        {task.label}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{task.course}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.min}m
                        </span>
                        {task.description && (
                          <>
                            <span>•</span>
                            <span className="line-clamp-1 max-w-[200px]">{task.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                      {task.tag}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link to="/pomodoro">
                        <Play className="h-4 w-4 text-primary" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
            <BookOpen className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <div className="text-sm font-semibold text-foreground">
              {selectedDayInfo.today ? "No tasks scheduled for today" : `No tasks scheduled for ${selectedDayInfo.formattedLabel}`}
            </div>
            <p className="mt-1 max-w-xs text-xs">
              {enrolledCount === 0
                ? "Add a college course to upload syllabus and generate your personalized daily plan."
                : selectedDayInfo.isPast
                  ? "This was a rest day with no active study tasks recorded."
                  : "Enjoy your rest day or jump into active recall with your flashcards and quizzes."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {enrolledCount === 0 ? (
                <Button
                  variant="magic"
                  size="sm"
                  asChild
                  className="gap-1.5 rounded-xl font-semibold"
                >
                  <Link to="/courses">
                    Add First Course
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" asChild className="text-xs font-semibold">
                    <Link to="/flashcards">⚡ Review Flashcards</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="text-xs font-semibold">
                    <Link to="/quiz">🎯 Practice Quiz</Link>
                  </Button>
                  {!selectedDayInfo.today && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedDateStr(todayStr)}
                      className="text-xs font-semibold text-primary"
                    >
                      Jump to Today
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {hasPlans && activeChecklistTasks.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Total: {activeChecklistTasks.reduce((acc, t) => acc + t.min, 0)} minutes of scheduled study
            </span>
            <Button variant="magic" size="sm" asChild>
              <Link to="/pomodoro">
                <Timer className="mr-1.5 h-3.5 w-3.5" /> Start Focus Session
              </Link>
            </Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-xl font-semibold">This week</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click any day to view your progress</p>
            </div>
            {selectedDateStr !== todayStr && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDateStr(todayStr)}
                className="h-7 px-2 text-xs font-semibold text-primary hover:bg-primary/10 gap-1"
                title="Return to today"
              >
                Today ↩
              </Button>
            )}
          </div>

          {/* 7 Days Interactive Strip */}
          <div className="grid grid-cols-7 gap-1.5">
            {week.map((w) => {
              const isSelected = w.dateStr === selectedDateStr;
              const stats = getDayStats(w.dateStr, w.isPast);
              const isDone = stats.total > 0 && stats.completed === stats.total;
              const hasProgress = stats.completed > 0 && stats.completed < stats.total;

              return (
                <button
                  key={w.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(w.dateStr)}
                  className={cn(
                    "group relative flex flex-col items-center gap-1 rounded-xl py-2 px-1 transition-all cursor-pointer border text-center select-none",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-soft ring-2 ring-primary/40 font-bold scale-[1.03] z-10"
                      : w.today
                        ? "border-primary/40 bg-gradient-magic text-primary-foreground shadow-glow font-semibold"
                        : "border-transparent bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-border"
                  )}
                  title={`${w.formattedLabel}: ${stats.completed}/${stats.total} tasks completed`}
                >
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", isSelected ? "text-primary" : w.today ? "opacity-90" : "opacity-60")}>
                    {w.d}
                  </span>
                  <span className="font-display text-base font-bold leading-none">
                    {w.n}
                  </span>
                  <div className="mt-0.5 flex items-center justify-center h-2">
                    {isDone ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                    ) : hasProgress ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                    ) : stats.total > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Day Progress Details */}
          <div className="mt-4 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {selectedDayInfo.formattedLabel}
                {selectedDayInfo.today && (
                  <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[9px] font-bold uppercase">
                    Today
                  </span>
                )}
              </span>
              <span className={cn("font-bold", selectedDayStats.percent === 100 && selectedDayStats.total > 0 ? "text-emerald-500" : "text-primary")}>
                {selectedDayStats.percent}% complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  selectedDayStats.percent === 100 && selectedDayStats.total > 0
                    ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                    : "bg-gradient-magic"
                )}
                style={{ width: `${selectedDayStats.percent}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-accent/60 p-2">
                <div className="font-display text-lg font-bold text-foreground">
                  {selectedDayStats.completed} <span className="text-xs font-normal text-muted-foreground">/ {selectedDayStats.total}</span>
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">tasks completed</div>
              </div>
              <div className="rounded-lg bg-accent/60 p-2">
                <div className="font-display text-lg font-bold text-foreground">
                  {selectedDayStats.studiedHours}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                  {selectedDayInfo.today ? "studied today" : "study time"}
                </div>
              </div>
            </div>

            <p className="mt-2.5 text-[11px] text-muted-foreground text-center">
              {selectedDayStats.total > 0
                ? selectedDayStats.completed === selectedDayStats.total
                  ? "🎉 All daily goals achieved! Fantastic job."
                  : `${selectedDayStats.total - selectedDayStats.completed} tasks remaining for this day.`
                : selectedDayInfo.isPast
                  ? "Rest day • Past schedule"
                  : "No tasks scheduled for this day • Rest or review flashcards ✨"}
            </p>
          </div>
        </div>
      </Card>

      {/* SPACE DOWN THE DASHBOARD: CAMPUS EXAM CHALLENGES */}
      <div className="lg:col-span-3 flex flex-col gap-4 mt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary border border-primary/20">
                <Flame className="h-3.5 w-3.5 text-primary" />
                CAMPUS STUDY CHALLENGES
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Same College & Major
              </span>
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              Classmate Exam Challenges
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground max-w-2xl">
              Exams and course syllabi uploaded by peers in {campusInfo.col || "your college"}. Join a challenge to instantly adopt their syllabus, day-by-day plan, active-recall flashcards, and quizzes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {campusInfo.uni && (
              <span className="rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground">
                🏛️ {campusInfo.uni}
              </span>
            )}
            {campusInfo.major && (
              <span className="rounded-lg bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 font-bold">
                🎓 {campusInfo.major}
              </span>
            )}
          </div>
        </div>

        {loadingChallenges ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl border border-dashed bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            <GraduationCap className="mx-auto h-8 w-8 text-primary/60 mb-2" />
            <p className="text-sm font-semibold">No challenges yet in your catalog.</p>
            <p className="text-xs mt-1">Upload a syllabus or add an exam to spark the first study challenge for your peers!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {challenges.map((ch) => {
              const days = daysUntil(ch.examDate);
              const urgencyStatus = days < 15 ? "red" : days <= 30 ? "orange" : "green";
              const badgeColor =
                urgencyStatus === "red"
                  ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                  : urgencyStatus === "orange"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

              return (
                <Card
                  key={ch.courseName}
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden p-5 transition hover:shadow-soft",
                    ch.isJoined ? "border-emerald-500/30 bg-emerald-500/5" : "hover:border-primary/50"
                  )}
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary uppercase tracking-wide border border-primary/20">
                          {ch.examType || "EXAM"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReportingCourse({ name: ch.courseName, id: ch.courseId });
                            setReportDialogOpen(true);
                          }}
                          title="Report this course if syllabus or details are incorrect"
                        >
                          <Flag className="h-3 w-3" />
                        </Button>
                      </div>
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 text-[11px] font-bold flex items-center gap-1",
                          badgeColor
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {days > 0 ? `${days}d left` : "Today"}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition line-clamp-1">
                        {ch.courseName}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {ch.professor || "Faculty Member"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        {ch.chaptersCount > 0
                          ? `${ch.chaptersCount} chapters uploaded from syllabus`
                          : "Full peer syllabus ready"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        Uploaded by {ch.uploaderName || "Classmate"} · {ch.peerCount || 3} studying
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/50">
                    {ch.isJoined ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          Joined the Challenge
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <Button size="sm" variant="outline" asChild className="h-7 text-[11px] font-semibold px-1">
                            <Link to="/plan">📅 Plan</Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="h-7 text-[11px] font-semibold px-1">
                            <Link to="/flashcards">⚡ Cards</Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild className="h-7 text-[11px] font-semibold px-1">
                            <Link to="/quiz">🎯 Quiz</Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="magic"
                        className="w-full gap-2 font-bold shadow-soft"
                        onClick={() => handleJoinChallenge(ch)}
                        disabled={joiningCourse === ch.courseName}
                      >
                        {joiningCourse === ch.courseName ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Adopting Syllabus & Plan...
                          </>
                        ) : (
                          <>
                            <Flame className="h-4 w-4" />
                            Joined the Challenge
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* SCHEDULE DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Adjust my schedule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-3">
              <Label>Daily study time</Label>
              <Slider defaultValue={[2]} max={6} step={0.5} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Study on weekends</Label>
              <Switch defaultChecked />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CHALLENGE JOINED CELEBRATION MODAL */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2 text-foreground">
              <Sparkles className="h-6 w-6 text-primary" />
              Challenge Joined! 🚀
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <p className="text-sm font-semibold text-foreground">
                You are now competing in the <span className="text-primary font-bold">{joinedResult?.courseName}</span> {joinedResult?.examType} challenge!
              </p>
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Exam scheduled for {joinedResult?.examDate} ({joinedResult?.planDays} days remaining)
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">1. Syllabus Adopted</div>
                  <div className="text-xs text-muted-foreground">
                    Loaded {joinedResult?.chaptersCount} chapters uploaded by classmates directly into your course profile.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">2. Day-by-Day Study Plan Ready</div>
                  <div className="text-xs text-muted-foreground">
                    Personalized study timeline mapped out day-by-day up to your exam day.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                  <Brain className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">3. Active-Recall Flashcards Ready</div>
                  <div className="text-xs text-muted-foreground">
                    {joinedResult?.cardsCount} bite-sized NotebookLM-style flashcards prepared for rapid spaced review.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border bg-card p-3 shadow-sm">
                <div className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">4. Exam Practice Quiz Prepared</div>
                  <div className="text-xs text-muted-foreground">
                    {joinedResult?.quizCount} exam questions ready with immediate explanations.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                variant="magic"
                className="w-full gap-2 font-bold shadow-soft"
                onClick={() => {
                  setSuccessModalOpen(false);
                  nav({ to: "/plan" });
                }}
              >
                <Calendar className="h-4 w-4" />
                View Study Plan
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5 font-semibold"
                  onClick={() => {
                    setSuccessModalOpen(false);
                    nav({ to: "/flashcards" });
                  }}
                >
                  <Brain className="h-4 w-4 text-primary" />
                  Flashcards
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5 font-semibold"
                  onClick={() => {
                    setSuccessModalOpen(false);
                    nav({ to: "/quiz" });
                  }}
                >
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Take Quiz
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground mt-1"
                onClick={() => setSuccessModalOpen(false)}
              >
                Stay on Dashboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ReportCourseDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        courseName={reportingCourse.name}
        courseId={reportingCourse.id}
      />
    </div>
  );
}
