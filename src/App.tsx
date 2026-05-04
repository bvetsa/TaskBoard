import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { supabase } from './supabaseClient'

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'

type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: 'low' | 'normal' | 'high'
  due_date: string | null
  created_at: string
  updated_at: string
}

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'in_review', title: 'In Review' },
  { status: 'done', title: 'Done' },
]

const initialTasks: Task[] = [
  {
    id: '1',
    user_id: 'demo',
    title: 'Design task card layout',
    description: 'Create a compact card with title, description, and priority.',
    status: 'todo',
    priority: 'high',
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'demo',
    title: 'Set up Supabase schema',
    description: 'Create tables, RLS policies, and auth-safe user ownership.',
    status: 'in_progress',
    priority: 'high',
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'demo',
    title: 'Plan responsive board layout',
    description: 'Make the board usable on laptop and mobile screens.',
    status: 'in_review',
    priority: 'normal',
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    user_id: 'demo',
    title: 'Enable anonymous sign-in',
    description: 'Allow guests to get their own private workspace.',
    status: 'done',
    priority: 'low',
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

function formatDueDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function getDueDateTone(task: Task) {
  if (!task.due_date || task.status === 'done') return 'neutral'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = new Date(`${task.due_date}T00:00:00`)
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / 86400000)

  if (daysUntilDue < 0) return 'overdue'
  if (daysUntilDue <= 2) return 'soon'
  return 'neutral'
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('normal')
  const [dueDate, setDueDate] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>(
    'all',
  )

  const completedTasks = tasks.filter((task) => task.status === 'done').length
  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date || task.status === 'done') return false

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const due = new Date(`${task.due_date}T00:00:00`)
    return due < today
  }).length
  const visibleTasks = tasks.filter((task) => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !normalizedSearch ||
      task.title.toLowerCase().includes(normalizedSearch) ||
      (task.description ?? '').toLowerCase().includes(normalizedSearch)
    const matchesPriority =
      priorityFilter === 'all' || task.priority === priorityFilter

    return matchesSearch && matchesPriority
  })

  useEffect(() => {
    async function loadBoard() {
      setIsLoading(true)
      setErrorMessage(null)

      const sessionResult = await supabase.auth.getSession()
      if (sessionResult.error) {
        setErrorMessage(sessionResult.error.message)
        setIsLoading(false)
        return
      }

      let user = sessionResult.data.session?.user ?? null

      if (!user) {
        const signInResult = await supabase.auth.signInAnonymously()
        if (signInResult.error || !signInResult.data.user) {
          setErrorMessage(
            signInResult.error?.message ?? 'Anonymous sign-in failed.',
          )
          setIsLoading(false)
          return
        }

        user = signInResult.data.user
      }

      setUserId(user.id)

      const tasksResult = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true })

      if (tasksResult.error) {
        setErrorMessage(tasksResult.error.message)
      } else {
        setTasks(tasksResult.data as Task[])
      }

      setIsLoading(false)
    }

    void loadBoard()
  }, [])

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle || !userId) return

    const newTask = {
      title: trimmedTitle,
      description: description.trim() || null,
      status: 'todo',
      priority,
      due_date: dueDate || null,
      user_id: userId,
    }

    const insertResult = await supabase
      .from('tasks')
      .insert(newTask)
      .select()
      .single()

    if (insertResult.error) {
      setErrorMessage(insertResult.error.message)
      return
    }

    setTasks((currentTasks) => [insertResult.data as Task, ...currentTasks])
    setTitle('')
    setDescription('')
    setPriority('normal')
    setDueDate('')
    setIsFormOpen(false)
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    const originalTasks = tasks

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    )

    const updateResult = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)

    if (updateResult.error) {
      setTasks(originalTasks)
      setErrorMessage(updateResult.error.message)
    }
  }

  function handleDrop(status: TaskStatus) {
    if (!draggingTaskId) return

    void moveTask(draggingTaskId, status)
    setDraggingTaskId(null)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Next Play Games Assessment</p>
          <h1>TaskBoard</h1>
          <p className="session-note">
            {userId ? `Guest workspace ${userId.slice(0, 8)}` : 'Loading guest workspace'}
          </p>
        </div>
        <div className="summary-strip" aria-label="Board summary">
          <span>{tasks.length} total</span>
          <span>{completedTasks} done</span>
          <span className={overdueTasks > 0 ? 'danger' : ''}>
            {overdueTasks} overdue
          </span>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)}>
          New task
        </button>
      </header>

      {errorMessage && <div className="system-message">{errorMessage}</div>}

      <section className="toolbar" aria-label="Board filters">
        <label>
          Search
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search title or description"
          />
        </label>

        <label>
          Priority
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as Task['priority'] | 'all')
            }
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            setPriorityFilter('all')
          }}
        >
          Clear filters
        </button>
      </section>

      {isFormOpen && (
        <form className="task-form" onSubmit={handleCreateTask}>
          <div className="form-grid">
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Write task title"
                autoFocus
              />
            </label>

            <label>
              Priority
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as Task['priority'])
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>

            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add useful context for the work"
              rows={3}
            />
          </label>

          <div className="form-actions">
            <button type="button" onClick={() => setIsFormOpen(false)}>
              Cancel
            </button>
            <button type="submit">Create task</button>
          </div>
        </form>
      )}

      <section className="board" aria-label="Kanban task board">
        {isLoading ? (
          <div className="loading-state">Loading board...</div>
        ) : (
          columns.map((column) => {
          const columnTasks = visibleTasks.filter(
            (task) => task.status === column.status,
          )

          return (
            <section
              className="column"
              key={column.status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(column.status)}
            >
              <div className="column-header">
                <h2>{column.title}</h2>
                <span>{columnTasks.length}</span>
              </div>

              <div className="task-list">
                {columnTasks.map((task) => (
                  <article
                    className="task-card"
                    draggable
                    key={task.id}
                    onDragStart={() => setDraggingTaskId(task.id)}
                    onDragEnd={() => setDraggingTaskId(null)}
                  >
                    <span className={`priority ${task.priority}`}>
                      {task.priority}
                    </span>
                    <h3>{task.title}</h3>
                    <p>{task.description ?? 'No description added yet.'}</p>
                    {task.due_date && (
                      <span className={`due-date ${getDueDateTone(task)}`}>
                        {formatDueDate(task.due_date)}
                      </span>
                    )}
                  </article>
                ))}
                {columnTasks.length === 0 && (
                  <div className="empty-column">No matching tasks</div>
                )}
              </div>
            </section>
          )
        }))}
      </section>
    </main>
  )
}

export default App
