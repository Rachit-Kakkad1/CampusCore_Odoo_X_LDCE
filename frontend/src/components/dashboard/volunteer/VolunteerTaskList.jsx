// frontend/src/components/dashboard/volunteer/VolunteerTaskList.jsx
import React, { useState, useMemo } from 'react';
import VolunteerTaskCard from './VolunteerTaskCard';
import { DashboardEmptyState } from '../DashboardEmptyState';
import { Search, Filter, CheckCircle2, Clock, CircleDot, ListTodo } from 'lucide-react';

/**
 * VolunteerTaskList Component
 * Filterable list of assigned and available tasks with progress tracking.
 *
 * @param {Object} props
 * @param {Array} props.tasks
 * @param {Function} props.onStatusChange - Callback (taskId, newStatus) => Promise
 * @param {boolean} [props.loading]
 */
export const VolunteerTaskList = ({
  tasks = [],
  onStatusChange,
  loading = false,
}) => {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const completedCount = tasks.filter(
    (t) => (t.status || '').toUpperCase() === 'COMPLETED'
  ).length;
  const inProgressCount = tasks.filter(
    (t) => (t.status || '').toUpperCase() === 'IN_PROGRESS'
  ).length;
  const todoCount = tasks.filter(
    (t) => (t.status || '').toUpperCase() === 'TODO'
  ).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus =
        filterStatus === 'ALL' ||
        (t.status || '').toUpperCase() === filterStatus;

      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.fundraiser_title && t.fundraiser_title.toLowerCase().includes(q));

      return matchStatus && matchQuery;
    });
  }, [tasks, filterStatus, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Progress & Overview Bar */}
      <div className="p-6 border border-border bg-white shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-sans font-bold text-lg text-slate-900 tracking-tight">
              Operational Task Progress
            </h2>
            <p className="font-mono text-xs text-slate-500">
              {completedCount} of {totalCount} tasks finished across assigned events
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
            <span className="text-slate-400 uppercase text-[10px]">Completion</span>
          </div>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="w-full h-2.5 bg-slate-100 overflow-hidden flex">
          <div
            style={{ width: `${(completedCount / Math.max(1, totalCount)) * 100}%` }}
            className="bg-emerald-600 transition-all duration-500"
            title={`Completed: ${completedCount}`}
          />
          <div
            style={{ width: `${(inProgressCount / Math.max(1, totalCount)) * 100}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`In Progress: ${inProgressCount}`}
          />
          <div
            style={{ width: `${(todoCount / Math.max(1, totalCount)) * 100}%` }}
            className="bg-slate-300 transition-all duration-500"
            title={`To Do: ${todoCount}`}
          />
        </div>

        {/* Quick Legend */}
        <div className="flex flex-wrap items-center gap-6 font-mono text-xs pt-1">
          <span className="flex items-center gap-1.5 text-slate-600">
            <CircleDot className="w-3.5 h-3.5 text-slate-400" />
            <span>To Do: {todoCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>In Progress: {inProgressCount}</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completed: {completedCount}</span>
          </span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by title or event..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border bg-white text-xs font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-slate-900 transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: 'TODO', label: `To Do (${todoCount})` },
            { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 font-mono text-xs uppercase tracking-wider border transition-colors shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                  : 'bg-white text-slate-600 border-border hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <DashboardEmptyState
          title={searchQuery ? 'No Matching Tasks Found' : 'No Tasks in this Category'}
          description={
            searchQuery
              ? `No tasks matched your query "${searchQuery}". Try searching with different keywords.`
              : 'All clear! There are currently no tasks listed under this filter.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <VolunteerTaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerTaskList;
