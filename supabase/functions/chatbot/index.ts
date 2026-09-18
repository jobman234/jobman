import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the Jobman Concierge — the assistant for Jobman (www.jobman.ng), Nigeria's trusted marketplace for skilled artisans.

HOW JOBMAN WORKS NOW:
Customers do NOT browse or negotiate with artisans themselves. They tell you what they need, you capture it as a request, and the Jobman admin team then contacts suitable artisans offline and comes back with an agreed artisan, price and timeline. Payment is held in escrow inside Jobman until the work is done.

YOUR JOB:
1. Understand what artisan(s) the customer needs. A customer may need SEVERAL artisans across different trades in one conversation — create a SEPARATE request for each trade.
2. Before creating a request, make sure you know: the trade (e.g. Plumber, Electrician, Carpenter, Tiler, Painter, Welder, Mason, AC Technician), the state and LGA/area in Nigeria, and a short description of the work. Ask for budget range and preferred start date, but do not block on them.
3. Use the search_artisans tool to show the customer which verified artisans are available near them. Present them briefly (name, trade, location). Never share phone numbers, emails or addresses.
4. Use create_artisan_request once you have trade + location + description. Confirm clearly to the customer what you have logged and tell them the Jobman team will match an artisan and come back in this same chat.
5. Use list_my_requests when the customer asks about the status of their requests.

RULES:
- Be warm, concise and professional. Natural Nigerian English is fine. Keep answers under 150 words unless asked for detail.
- Never share or ask for passwords, NIN, or bank details.
- Never promise a specific artisan or price — admin confirms that.
- Only create one request per trade. Do not create duplicates for a trade already requested in this conversation.
- You can also answer FAQs: escrow (funds held until work is confirmed complete, 48-hour auto-release after the artisan marks a job done), verification, wallet, referrals (₦300 per verified referral), disputes, and profile boost.
- For account-specific problems, point users to the Contact Us page.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_artisans",
      description: "Search verified artisans on Jobman by trade and optional location.",
      parameters: {
        type: "object",
        properties: {
          trade: { type: "string", description: "Trade to search for, e.g. Plumber" },
          state: { type: "string", description: "Nigerian state, optional" },
          lga: { type: "string", description: "LGA or area, optional" },
        },
        required: ["trade"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_artisan_request",
      description:
        "Log a request for ONE artisan of a specific trade. Call once per trade needed.",
      parameters: {
        type: "object",
        properties: {
          trade_category: { type: "string" },
          description: { type: "string", description: "What work needs doing" },
          location_state: { type: "string" },
          location_lga: { type: "string" },
          budget_min: { type: "number" },
          budget_max: { type: "number" },
          preferred_start: { type: "string", description: "ISO date YYYY-MM-DD, optional" },
        },
        required: ["trade_category", "description", "location_state"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_requests",
      description: "List the current customer's artisan requests and their statuses.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

    const createdRequestIds: string[] = [];

    async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
      if (name === "search_artisans") {
        const trade = String(args.trade ?? "");
        let q = supabase
          .from("artisan_profiles")
          .select("user_id, primary_trade, verification_status, bio")
          .eq("verification_status", "approved")
          .eq("is_public", true)
          .limit(20);
        if (trade) q = q.ilike("primary_trade", `%${trade}%`);
        const { data: artisans, error } = await q;
        if (error) return JSON.stringify({ error: error.message });
        if (!artisans?.length) return JSON.stringify({ artisans: [] });

        const ids = artisans.map((a) => a.user_id);
        const { data: profs } = await supabase
          .from("public_profiles")
          .select("user_id, full_name, state, lga")
          .in("user_id", ids);
        const pmap = new Map((profs ?? []).map((p) => [p.user_id, p]));

        let rows = artisans.map((a) => {
          const p = pmap.get(a.user_id);
          return {
            id: a.user_id,
            name: p?.full_name ?? "Artisan",
            trade: a.primary_trade,
            state: p?.state ?? null,
            lga: p?.lga ?? null,
            verified: true,
          };
        });

        const state = args.state ? String(args.state).toLowerCase() : null;
        const lga = args.lga ? String(args.lga).toLowerCase() : null;
        if (state) {
          const near = rows.filter((r) => (r.state ?? "").toLowerCase().includes(state));
          if (near.length) rows = near;
        }
        if (lga) {
          rows.sort((a, b) =>
            Number((b.lga ?? "").toLowerCase().includes(lga)) -
            Number((a.lga ?? "").toLowerCase().includes(lga))
          );
        }
        return JSON.stringify({ artisans: rows.slice(0, 8) });
      }

      if (name === "create_artisan_request") {
        if (!user) return JSON.stringify({ error: "You must be signed in to create a request." });
        const payload = {
          user_id: user.id,
          conversation_id: conversationId ?? null,
          trade_category: String(args.trade_category ?? "").trim(),
          description: String(args.description ?? "").trim(),
          location_state: args.location_state ? String(args.location_state) : null,
          location_lga: args.location_lga ? String(args.location_lga) : null,
          budget_min: typeof args.budget_min === "number" ? args.budget_min : null,
          budget_max: typeof args.budget_max === "number" ? args.budget_max : null,
          preferred_start: args.preferred_start ? String(args.preferred_start) : null,
          status: "admin_review" as const,
        };
        const { data, error } = await supabase
          .from("artisan_requests")
          .insert(payload)
          .select("id, trade_category, location_state, location_lga, status")
          .single();
        if (error) return JSON.stringify({ error: error.message });
        createdRequestIds.push(data.id);
        if (conversationId) {
          await supabase
            .from("chat_conversations")
            .update({ admin_unread: true })
            .eq("id", conversationId);
        }
        return JSON.stringify({ created: data });
      }

      if (name === "list_my_requests") {
        if (!user) return JSON.stringify({ requests: [] });
        const { data } = await supabase
          .from("artisan_requests")
          .select("id, trade_category, location_state, location_lga, status, agreed_price, agreed_timeline, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);
        return JSON.stringify({ requests: data ?? [] });
      }

      return JSON.stringify({ error: `Unknown tool ${name}` });
    }

    const convo: Record<string, unknown>[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(messages ?? []),
    ];

    let finalText = "";
    for (let step = 0; step < 6; step++) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.6-flash",
          messages: convo,
          tools: TOOLS,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const msg = choice?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls ?? [];
      if (toolCalls.length === 0) {
        finalText = msg.content ?? "";
        break;
      }

      convo.push(msg);
      for (const call of toolCalls) {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(call.function?.arguments || "{}");
        } catch {
          parsed = {};
        }
        const result = await runTool(call.function?.name ?? "", parsed);
        convo.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    }

    if (!finalText) {
      finalText = "Sorry, I couldn't put a reply together. Could you try rephrasing that?";
    }

    return new Response(
      JSON.stringify({ content: finalText, createdRequestIds }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("chatbot error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
