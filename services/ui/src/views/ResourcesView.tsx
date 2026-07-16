import React, { useEffect, useState, useMemo } from "react";
import {
  getExecutions,
  WorkflowExecution,
  getConfig,
  AppConfig
} from "../utils/api";
import Spinner from "../components/global/Spinner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  CpuChipIcon,
  CircleStackIcon,
  FunnelIcon,
  ArrowPathIcon,
  ServerStackIcon,
  ComputerDesktopIcon
} from "@heroicons/react/24/outline";

const COLORS = ["#004170", "#0078b4", "#00a3e0", "#71c5ee", "#b1e4ff"];

const ResourcesView: React.FC = () => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Filters
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [timeRange, setTimeRange] = useState("7d");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exes, cfg] = await Promise.all([getExecutions(), getConfig()]);
      setExecutions(exes);
      setConfig(cfg);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    let result = executions;

    // Filter by time range
    const now = new Date();
    const rangeMs =
      timeRange === "24h"
        ? 24 * 3600000
        : timeRange === "7d"
          ? 7 * 24 * 3600000
          : 30 * 24 * 3600000;

    result = result.filter((exe) => {
      const created = new Date(exe.metadata.creationTimestamp);
      return now.getTime() - created.getTime() <= rangeMs;
    });

    if (workflowFilter) {
      result = result.filter(
        (exe) =>
          exe.metadata.labels?.["workflows.argoproj.io/workflow-template"] ===
            workflowFilter || exe.metadata.name.startsWith(workflowFilter)
      );
    }

    if (phaseFilter) {
      result = result.filter(
        (exe) => (exe.status?.phase || "Pending") === phaseFilter
      );
    }

    return result;
  }, [executions, workflowFilter, phaseFilter, timeRange]);

  const stats = useMemo(() => {
    const workflowStats: Record<
      string,
      { cpu: number; memory: number; storage: number; gpu: number }
    > = {};
    const dailyStats: Record<
      string,
      { cpu: number; memory: number; storage: number; gpu: number }
    > = {};

    filteredData.forEach((exe) => {
      const duration = exe.status?.resourcesDuration || {};
      const cpu = duration.cpu || 0;
      const memory = duration.memory || 0;
      const storage = duration["ephemeral-storage"] || duration.storage || 0;
      const gpu = duration["nvidia.com/gpu"] || duration.gpu || 0;

      // Group by workflow
      const wfName =
        exe.metadata.labels?.["workflows.argoproj.io/workflow-template"] ||
        "other";
      if (!workflowStats[wfName])
        workflowStats[wfName] = { cpu: 0, memory: 0, storage: 0, gpu: 0 };
      workflowStats[wfName].cpu += cpu;
      workflowStats[wfName].memory += memory;
      workflowStats[wfName].storage += storage;
      workflowStats[wfName].gpu += gpu;

      // Group by day
      const day = new Date(exe.metadata.creationTimestamp).toLocaleDateString();
      if (!dailyStats[day])
        dailyStats[day] = { cpu: 0, memory: 0, storage: 0, gpu: 0 };
      dailyStats[day].cpu += cpu;
      dailyStats[day].memory += memory;
      dailyStats[day].storage += storage;
      dailyStats[day].gpu += gpu;
    });

    const workflowChartData = Object.entries(workflowStats)
      .map(([name, data], index) => ({
        name,
        cpu: Number((data.cpu / 3600).toFixed(2)), // in core-hours
        memory: Number((data.memory / 3600).toFixed(2)), // in GB-hours
        storage: Number((data.storage / 3600).toFixed(2)), // in GB-hours
        gpu: Number((data.gpu / 3600).toFixed(2)), // in GPU-hours
        fill: COLORS[index % COLORS.length] // Inject color directly into data
      }))
      .sort((a, b) => b.cpu - a.cpu);

    const dailyChartData = Object.entries(dailyStats)
      .map(([date, data]) => ({
        date,
        cpu: Number((data.cpu / 3600).toFixed(2)),
        memory: Number((data.memory / 3600).toFixed(2)),
        storage: Number((data.storage / 3600).toFixed(2)),
        gpu: Number((data.gpu / 3600).toFixed(2))
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalCpu = filteredData.reduce(
      (acc, exe) => acc + (exe.status?.resourcesDuration?.cpu || 0),
      0
    );
    const totalMem = filteredData.reduce(
      (acc, exe) => acc + (exe.status?.resourcesDuration?.memory || 0),
      0
    );
    const totalStorage = filteredData.reduce(
      (acc, exe) =>
        acc +
        (exe.status?.resourcesDuration?.["ephemeral-storage"] ||
          exe.status?.resourcesDuration?.storage ||
          0),
      0
    );
    const totalGpu = filteredData.reduce(
      (acc, exe) =>
        acc +
        (exe.status?.resourcesDuration?.["nvidia.com/gpu"] ||
          exe.status?.resourcesDuration?.gpu ||
          0),
      0
    );

    return {
      workflowChartData,
      dailyChartData,
      totalCpu: (totalCpu / 3600).toFixed(2),
      totalMem: (totalMem / 3600).toFixed(2),
      totalStorage: (totalStorage / 3600).toFixed(2),
      totalGpu: (totalGpu / 3600).toFixed(2)
    };
  }, [filteredData]);

  const uniqueWorkflows = useMemo(() => {
    const set = new Set<string>();
    executions.forEach((exe) => {
      const name =
        exe.metadata.labels?.["workflows.argoproj.io/workflow-template"];
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [executions]);

  if (loading && executions.length === 0)
    return (
      <div className="flex justify-center p-12">
        <Spinner className="w-8 h-8 text-[#004170]" />
      </div>
    );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-[calc(100vh-4rem)] overflow-y-auto pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#004170]">
            Resources Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Aggregated resource consumption across workflow runs
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <ArrowPathIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 font-medium mb-1 flex items-center">
            <FunnelIcon className="w-3 h-3 mr-1" /> Workflow Template
          </label>
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            className="border border-gray-300 text-sm rounded px-3 py-2 focus:outline-none focus:border-[#004170] bg-white"
          >
            <option value="">All Templates</option>
            {uniqueWorkflows.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 font-medium mb-1">
            Status
          </label>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="border border-gray-300 text-sm rounded px-3 py-2 focus:outline-none focus:border-[#004170] bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Succeeded">Succeeded</option>
            <option value="Failed">Failed</option>
            <option value="Running">Running</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 font-medium mb-1">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border border-gray-300 text-sm rounded px-3 py-2 focus:outline-none focus:border-[#004170] bg-white"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="bg-blue-50 px-4 py-2 rounded-md border border-blue-100 w-full text-center">
            <span className="text-xs text-blue-600 font-bold uppercase block">
              Executions
            </span>
            <span className="text-xl font-bold text-[#004170]">
              {filteredData.length}
            </span>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
            <CpuChipIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider truncate">
              Total CPU
            </p>
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {stats.totalCpu}{" "}
              <span className="text-sm font-normal text-gray-400 italic">
                core-hours
              </span>
            </h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 rounded-lg flex-shrink-0">
            <CircleStackIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider truncate">
              Total Memory
            </p>
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {stats.totalMem}{" "}
              <span className="text-sm font-normal text-gray-400 italic">
                GB-hours
              </span>
            </h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 rounded-lg flex-shrink-0">
            <ServerStackIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider truncate">
              Total Storage
            </p>
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {stats.totalStorage}{" "}
              <span className="text-sm font-normal text-gray-400 italic">
                GB-hours
              </span>
            </h2>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg flex-shrink-0">
            <ComputerDesktopIcon className="w-8 h-8 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider truncate">
              Total GPU
            </p>
            <h2 className="text-2xl font-bold text-gray-900 truncate">
              {stats.totalGpu}{" "}
              <span className="text-sm font-normal text-gray-400 italic">
                GPU-hours
              </span>
            </h2>
          </div>
        </div>
      </div>

      {/* Charts Row 1: Trends */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
          Usage Trends over Time
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.dailyChartData}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#004170" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#004170" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0078b4" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#0078b4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />
              <XAxis
                dataKey="date"
                fontSize={11}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={36}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="cpu"
                name="CPU (core-hours)"
                stroke="#004170"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCpu)"
              />
              <Area
                type="monotone"
                dataKey="memory"
                name="Memory (GB-hours)"
                stroke="#0078b4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMem)"
              />
              <Area
                type="monotone"
                dataKey="storage"
                name="Storage (GB-hours)"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorStorage)"
              />
              <Area
                type="monotone"
                dataKey="gpu"
                name="GPU (GPU-hours)"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorGpu)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2: Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            CPU Consumption by Workflow
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.workflowChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  type="number"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar
                  dataKey="cpu"
                  name="CPU (core-hours)"
                  radius={[0, 4, 4, 0]}
                  fill="#004170"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Memory Consumption by Workflow
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.workflowChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  type="number"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar
                  dataKey="memory"
                  name="Memory (GB-hours)"
                  radius={[0, 4, 4, 0]}
                  fill="#0078b4"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            Storage Consumption by Workflow
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.workflowChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  type="number"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar
                  dataKey="storage"
                  name="Storage (GB-hours)"
                  radius={[0, 4, 4, 0]}
                  fill="#10b981"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">
            GPU Consumption by Workflow
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.workflowChartData}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  type="number"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Bar
                  dataKey="gpu"
                  name="GPU (GPU-hours)"
                  radius={[0, 4, 4, 0]}
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourcesView;
