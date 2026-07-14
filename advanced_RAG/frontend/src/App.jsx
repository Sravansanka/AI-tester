import { useEffect, useState } from "react";
import TwoPaneLayout from "./components/Layout/TwoPaneLayout.jsx";
import PipelineTracker from "./components/PipelineTracker/PipelineTracker.jsx";
import ChatPane from "./components/Chat/ChatPane.jsx";
import { getCollectionStats } from "./api/client.js";
import { useSSEStream } from "./hooks/useSSEStream.js";

export default function App() {
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ component: null, priority: null, scenario_type: null });
  const streamState = useSSEStream();

  useEffect(() => {
    getCollectionStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <TwoPaneLayout
      left={<PipelineTracker stages={streamState.stages} errors={streamState.errors} />}
      right={
        <ChatPane stats={stats} filters={filters} onFiltersChange={setFilters} streamState={streamState} />
      }
    />
  );
}
