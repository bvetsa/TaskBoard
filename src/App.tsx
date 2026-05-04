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

const tasks: Task[] = [
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
  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Next Play Games Assessment</p>
          <h1>TaskBoard</h1>
        </div>
        <button type="button">New task</button>
      </header>

      <section className="board" aria-label="Kanban task board">
        {columns.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.status)

          return (
            <section className="column" key={column.status}>
              <div className="column-header">
                <h2>{column.title}</h2>
                <span>{columnTasks.length}</span>
              </div>

              <div className="task-list">
                {columnTasks.map((task) => (
                  <article className="task-card" key={task.id}>
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
