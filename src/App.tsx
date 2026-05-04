import { useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done'

type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: 'low' | 'normal' | 'high'
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
    title: 'Design task card layout',
    description: 'Create a compact card with title, description, and priority.',
    status: 'todo',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Set up Supabase schema',
    description: 'Create tables, RLS policies, and auth-safe user ownership.',
    status: 'in_progress',
    priority: 'high',
  },
  {
    id: '3',
    title: 'Plan responsive board layout',
    description: 'Make the board usable on laptop and mobile screens.',
    status: 'in_review',
    priority: 'normal',
  },
  {
    id: '4',
    title: 'Enable anonymous sign-in',
    description: 'Allow guests to get their own private workspace.',
    status: 'done',
    priority: 'low',
  },
]

function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('normal')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)

  function handleCreateTask(event: FormEvent) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      description: description.trim() || 'No description added yet.',
      status: 'todo',
      priority,
    }

    setTasks((currentTasks) => [newTask, ...currentTasks])
    setTitle('')
    setDescription('')
    setPriority('normal')
    setIsFormOpen(false)
  }

  function moveTask(taskId: string, status: TaskStatus) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task,
      ),
    )
  }

  function handleDrop(status: TaskStatus) {
    if (!draggingTaskId) return

    moveTask(draggingTaskId, status)
    setDraggingTaskId(null)
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Next Play Games Assessment</p>
          <h1>TaskBoard</h1>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)}>
          New task
        </button>
      </header>

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
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status)

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
                    <p>{task.description}</p>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </section>
    </main>
  )
}

export default App
