export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — StudyGenie` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — StudyGenie` },
    { property: "og:description", content: description },
  ],
});
