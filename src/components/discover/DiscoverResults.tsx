"use client";

import { useEffect, useReducer } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IntentSummary } from "@/components/discover/IntentSummary";
import { NarrativeSection, type NarrativeStatus } from "@/components/discover/NarrativeSection";
import { CommunitiesSection } from "@/components/discover/CommunitiesSection";
import { PropertiesSection } from "@/components/discover/PropertiesSection";
import { BrokersSection } from "@/components/discover/BrokersSection";
import { ErrorNotice } from "@/components/discover/ErrorNotice";
import { SearchingState } from "@/components/discover/SearchingState";
import type {
  DiscoverEvent,
  WireCommunity,
  WireIntent,
  WireProperty,
  WireRankedBroker,
} from "@/components/discover/types";

type State = {
  intent: WireIntent | null;
  communities: WireCommunity[] | null;
  properties: WireProperty[] | null;
  brokers: WireRankedBroker[] | null;
  narrative: string;
  narrativeStatus: NarrativeStatus;
  streamError: string | null;
  fatalError: string | null;
};

const initialState: State = {
  intent: null,
  communities: null,
  properties: null,
  brokers: null,
  narrative: "",
  narrativeStatus: "pending",
  streamError: null,
  fatalError: null,
};

type Action =
  | DiscoverEvent
  | { type: "restore"; state: State }
  | { type: "fatal"; message: string }
  | { type: "finalize" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "intent":
      return { ...state, intent: action.intent };
    case "communities":
      return { ...state, communities: action.communities };
    case "properties":
      return { ...state, properties: action.properties };
    case "brokers":
      return { ...state, brokers: action.brokers };
    case "narrative_delta":
      return { ...state, narrative: state.narrative + action.text, narrativeStatus: "streaming" };
    case "narrative_unavailable":
      return { ...state, narrativeStatus: "unavailable" };
    case "done":
      return {
        ...state,
        narrativeStatus: state.narrativeStatus === "streaming" ? "done" : state.narrativeStatus,
      };
    case "error":
      return { ...state, streamError: action.message };
    case "restore":
      return action.state;
    case "fatal":
      return { ...state, fatalError: action.message };
    case "finalize":
      return {
        ...state,
        communities: state.communities ?? [],
        properties: state.properties ?? [],
        brokers: state.brokers ?? [],
        narrativeStatus:
          state.narrativeStatus === "pending"
            ? "unavailable"
            : state.narrativeStatus === "streaming"
              ? "done"
              : state.narrativeStatus,
      };
    default:
      return state;
  }
}

/// Results are cached per query for the tab's lifetime. Without this, every
/// back-navigation from a property remounts this component and re-POSTs, which
/// costs a model call, makes the visitor wait again, and - worst - writes
/// another Enquiry row. Enquiry IS the lead record, so one buyer browsing four
/// listings would reach an agent's pipeline as five separate leads.
const CACHE_PREFIX = "majlis:discover:";

function cacheKey(query: string) {
  return CACHE_PREFIX + query;
}

function readCache(query: string): State | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (parsed.properties === null) return null;
    // A stream cannot be resumed, so a narrative caught mid-flight is
    // presented as whatever text we managed to capture.
    if (parsed.narrativeStatus === "streaming") {
      parsed.narrativeStatus = parsed.narrative.trim() ? "done" : "unavailable";
    }
    if (parsed.narrativeStatus === "pending") {
      parsed.narrativeStatus = "unavailable";
    }
    return parsed;
  } catch {
    // Private browsing, disabled storage, or bad JSON - just re-fetch.
    return null;
  }
}

function writeCache(query: string, state: State) {
  try {
    sessionStorage.setItem(cacheKey(query), JSON.stringify(state));
  } catch {
    // Storage full or unavailable; the page still works without the cache.
  }
}

export function DiscoverResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Arriving here with no brief is not a failure - it happens whenever one
  // of the "describe what you want" links is followed without a query.
  // Send the visitor straight to the composer instead of showing an error
  // for doing nothing wrong. `replace`, not `push`, so back doesn't loop here.
  useEffect(() => {
    if (!query) router.replace("/#discover");
  }, [query, router]);

  // Cache as soon as the results exist, not once the narrative finishes -
  // visitors routinely click a listing mid-narrative, and waiting for the
  // stream to settle meant nothing was ever cached for the common path.
  const worthCaching = state.properties !== null && state.fatalError === null;

  useEffect(() => {
    if (query && worthCaching) writeCache(query, state);
  }, [query, worthCaching, state]);

  useEffect(() => {
    if (!query) return;

    // Restore a completed run instead of paying for it twice.
    const cached = readCache(query);
    if (cached) {
      dispatch({ type: "restore", state: cached });
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        const res = await fetch("/api/discover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = "We couldn't build your matches. Please try again.";
          try {
            const body = (await res.json()) as { error?: string };
            if (body.error) message = body.error;
          } catch {
            // response body wasn't JSON - keep the generic message
          }
          dispatch({ type: "fatal", message });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line) {
              try {
                dispatch(JSON.parse(line) as DiscoverEvent);
              } catch {
                // A malformed line should never take down the whole page.
              }
            }
            newlineIndex = buffer.indexOf("\n");
          }
        }

        const trailing = buffer.trim();
        if (trailing) {
          try {
            dispatch(JSON.parse(trailing) as DiscoverEvent);
          } catch {
            // ignore trailing partial JSON
          }
        }

        dispatch({ type: "finalize" });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        dispatch({
          type: "fatal",
          message: "We lost the connection while building your matches. Please try again.",
        });
      }
    }

    run();
    return () => controller.abort();
  }, [query]);

  if (!query) {
    // The redirect effect above is already navigating away; render nothing
    // rather than flash an error the visitor didn't cause.
    return null;
  }

  if (state.fatalError) {
    return <ErrorNotice message={state.fatalError} />;
  }

  // Until the properties land there is nothing to show but empty frames, so
  // show real pipeline progress instead of three rows of grey boxes.
  if (state.properties === null) {
    return (
      <div className="pb-16">
        <SearchingState
          stages={[
            { label: "Reading your brief", done: state.intent !== null },
            { label: "Shortlisting areas", done: state.communities !== null },
            { label: "Searching Dubai inventory", done: state.properties !== null },
            { label: "Matching your specialist", done: state.brokers !== null },
          ]}
        />
      </div>
    );
  }

  return (
    <div className="pb-16">
      <IntentSummary query={query} intent={state.intent} />

      {state.streamError && (
        <div className="mx-auto mt-8 max-w-3xl px-6 sm:px-8">
          <p className="rounded-2xl border border-hairline-strong bg-surface/60 px-5 py-4 text-center text-sm text-ink-muted">
            {state.streamError}
          </p>
        </div>
      )}

      <NarrativeSection text={state.narrative} status={state.narrativeStatus} />
      <CommunitiesSection communities={state.communities} />
      <PropertiesSection properties={state.properties} />
      <BrokersSection brokers={state.brokers} />
    </div>
  );
}
