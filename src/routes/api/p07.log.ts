import { createFileRoute } from "@tanstack/react-router";
import { apply, validate, writeStatus, WriteRefused } from "@/lib/p07/write";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/p07/log")({
  server: {
    handlers: {
      GET: () => json(writeStatus()),
      POST: async ({ request }) => {
        const text = await request.text();
        if (text.length > 4000) return json({ error: "Request too large." }, 413);
        try {
          const action = validate(JSON.parse(text || "{}"), writeStatus().scope);
          return json(await apply(action));
        } catch (caught) {
          if (caught instanceof WriteRefused) return json({ error: caught.message }, caught.status);
          if (caught instanceof SyntaxError) return json({ error: "Send a JSON body." }, 400);
          return json(
            { error: caught instanceof Error ? caught.message : "The change failed." },
            500,
          );
        }
      },
    },
  },
});
