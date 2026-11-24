import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Learning } from "@/components/p07/Learning";

const TITLE = "Co-op learning · P07 · IPP";
const DESCRIPTION = "Learning agreement, log, midpoint action and final review for EG-DXB-028.";

export const Route = createFileRoute("/p07/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => (
    <AppShell wide>
      <PageHeader
        step="P07 · Co-op learning"
        title="Learning"
        subtitle="Placement EG-DXB-028. The placement and the Jira readiness row are stand-ins."
      />
      <Learning />
    </AppShell>
  ),
});
