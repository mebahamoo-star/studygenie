import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CalendarCheck, Layers, Trophy } from "lucide-react";
import { Branches, Plot, Riffle } from "@lucasmarkes/hairline/react";
import { Genie, GenieLogo } from "@/components/Genie";
import { ThemeToggle } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Boxes } from "@/components/ui/background-boxes";
import { RotatingText, RotatingTextContainer } from "@/components/animate-ui/texts/rotating";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyGenie — Study smarter, with a little magic" },
      { name: "description", content: "Upload your syllabus and let your genie build a study plan, flashcards and quizzes." },
      { property: "og:title", content: "StudyGenie — Study smarter, with a little magic" },
      { property: "og:description", content: "Upload your syllabus and let your genie build a study plan, flashcards and quizzes." },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: CalendarCheck,
    title: "Auto study plans",
    text: "From syllabus to schedule in seconds.",
    figure: Branches,
  },
  {
    icon: Layers,
    title: "Flashcards & quizzes",
    text: "Active recall, built in.",
    figure: Riffle,
  },
  {
    icon: Trophy,
    title: "Streaks & ranks",
    text: "Compete with your campus.",
    figure: Plot,
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Background Interactive Boxes (Theme-adapted for Light and Dark modes) */}
      <Boxes />

      {/* Soft Vignette Mask for depth and hero contrast */}
      <div className="absolute inset-0 w-full h-full bg-slate-50/70 dark:bg-slate-950/75 z-10 [mask-image:radial-gradient(transparent,white)] pointer-events-none transition-colors duration-300" />

      {/* Page Content */}
      <div className="relative z-20 pointer-events-none">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6 pointer-events-auto">
          <GenieLogo />
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Log in</Link>
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-8 py-16 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto"
          >
            <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-xs font-bold text-accent-foreground backdrop-blur-sm shadow-soft">
              ✨ Your wish: better grades
            </span>
            <h1 className="mt-5 text-6xl font-semibold leading-tight tracking-tight">
              <RotatingTextContainer
                text={["Study smarter,", "Think sharper,", "Achieve greater,"]}
                duration={2200}
                delay={0}
                y={-50}
                align="start"
                className="inline-block"
              >
                <RotatingText />
              </RotatingTextContainer>
              <br />
              <span className="text-gradient-magic">granted.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Your genie turns any syllabus into a daily plan you'll actually finish.
            </p>
            <Button variant="magic" size="lg" className="mt-8 shadow-glow" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="relative grid place-items-center pointer-events-none"
          >
            <div className="absolute h-80 w-80 rounded-full bg-gradient-magic opacity-25 blur-3xl pointer-events-none" />
            <Genie pose="high" className="relative h-96 w-96 animate-float drop-shadow-2xl pointer-events-auto" />
          </motion.div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-8 pb-24 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.1 }}
              className="group pointer-events-auto flex flex-col justify-between rounded-2xl border bg-card/85 backdrop-blur-md p-6 shadow-soft transition hover:border-primary/50 hover:bg-card"
            >
              <div>
                <div className="mb-4 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/40 p-2 transition group-hover:bg-muted/70">
                  <f.figure play intensity={0.65} className="h-full w-full" />
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-magic text-primary-foreground shadow-sm">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            </motion.div>
          ))}
        </section>
      </div>
    </div>
  );
}
