import { z } from "zod";

export const EXAM_DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export const feedbackSchema = z.object({
  difficulty: z.enum(EXAM_DIFFICULTIES, {
    errorMap: () => ({
      message: "postExam.feedback.errors.difficultyRequired",
    }),
  }),
  hardTopicIds: z.array(z.number()),
  testedTopicIds: z.array(z.number()),
});

export type FeedbackFormValues = z.infer<typeof feedbackSchema>;
