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

type TeamMember = {
  id: string
  user_id: string
  name: string
  avatar_color: string
  created_at: string
}

type TaskAssignee = {
  user_id: string
  task_id: string
  member_id: string
  created_at: string
}

type Label = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
}

type TaskLabel = {
  user_id: string
  task_id: string
  label_id: string
  created_at: string
}

type QuickFormType = 'member' | 'label'

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'To Do' },
  { status: 'in_progress', title: 'In Progress' },
  { status: 'in_review', title: 'In Review' },
  { status: 'done', title: 'Done' },
]

const avatarColors = ['#d94f45', '#21867a', '#4f62b3', '#b56b23', '#6d5cae']
const labelColors = ['#21867a', '#b56b23', '#4f62b3', '#d94f45', '#6d5cae']

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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [taskLabels, setTaskLabels] = useState<TaskLabel[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [activeQuickForm, setActiveQuickForm] = useState<QuickFormType | null>(
    null,
  )
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('normal')
  const [dueDate, setDueDate] = useState('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'all'>(
    'all',
  )
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [labelFilter, setLabelFilter] = useState('all')

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
    const matchesAssignee =
      assigneeFilter === 'all' ||
      taskAssignees.some(
        (assignee) =>
          assignee.task_id === task.id && assignee.member_id === assigneeFilter,
      )
    const matchesLabel =
      labelFilter === 'all' ||
      taskLabels.some(
        (label) => label.task_id === task.id && label.label_id === labelFilter,
      )

    return matchesSearch && matchesPriority && matchesAssignee && matchesLabel
  })
  const isEditing = editingTaskId !== null

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

      const [
        tasksResult,
        membersResult,
        assigneesResult,
        labelsResult,
        taskLabelsResult,
      ] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', {
            ascending: true,
          }),
          supabase.from('team_members').select('*').order('created_at', {
            ascending: true,
          }),
          supabase.from('task_assignees').select('*'),
          supabase.from('labels').select('*').order('created_at', {
            ascending: true,
          }),
          supabase.from('task_labels').select('*'),
        ])

      if (tasksResult.error) {
        setErrorMessage(tasksResult.error.message)
      } else {
        setTasks(tasksResult.data as Task[])
      }

      if (membersResult.error) {
        setErrorMessage(membersResult.error.message)
      } else {
        setMembers(membersResult.data as TeamMember[])
      }

      if (assigneesResult.error) {
        setErrorMessage(assigneesResult.error.message)
      } else {
        setTaskAssignees(assigneesResult.data as TaskAssignee[])
      }

      if (labelsResult.error) {
        setErrorMessage(labelsResult.error.message)
      } else {
        setLabels(labelsResult.data as Label[])
      }

      if (taskLabelsResult.error) {
        setErrorMessage(taskLabelsResult.error.message)
      } else {
        setTaskLabels(taskLabelsResult.data as TaskLabel[])
      }

      setIsLoading(false)
    }

    void loadBoard()
  }, [])

  function resetTaskForm() {
    setTitle('')
    setDescription('')
    setPriority('normal')
    setDueDate('')
    setSelectedAssigneeIds([])
    setSelectedLabelIds([])
    setEditingTaskId(null)
    setIsFormOpen(false)
  }

  function openCreateTaskForm() {
    resetTaskForm()
    setActiveQuickForm(null)
    setIsFormOpen(true)
  }

  function openEditTaskForm(task: Task) {
    setActiveQuickForm(null)
    setEditingTaskId(task.id)
    setTitle(task.title)
    setDescription(task.description ?? '')
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSelectedAssigneeIds(
      taskAssignees
        .filter((assignee) => assignee.task_id === task.id)
        .map((assignee) => assignee.member_id),
    )
    setSelectedLabelIds(
      taskLabels
        .filter((label) => label.task_id === task.id)
        .map((label) => label.label_id),
    )
    setIsFormOpen(true)
  }

  function closeQuickForm() {
    setActiveQuickForm(null)
    setNewMemberName('')
    setNewLabelName('')
  }

  function openMemberForm() {
    resetTaskForm()
    setNewMemberName('')
    setActiveQuickForm('member')
  }

  function openLabelForm() {
    resetTaskForm()
    setNewLabelName('')
    setActiveQuickForm('label')
  }

  async function replaceTaskAssignees(taskId: string, assigneeIds: string[]) {
    const deleteResult = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)

    if (deleteResult.error) {
      setErrorMessage(deleteResult.error.message)
      return false
    }

    if (assigneeIds.length === 0) {
      setTaskAssignees((currentAssignees) =>
        currentAssignees.filter((assignee) => assignee.task_id !== taskId),
      )
      return true
    }

    const assigneeRows = assigneeIds.map((memberId) => ({
      user_id: userId,
      task_id: taskId,
      member_id: memberId,
    }))

    const insertResult = await supabase
      .from('task_assignees')
      .insert(assigneeRows)
      .select()

    if (insertResult.error) {
      setErrorMessage(insertResult.error.message)
      return false
    }

    setTaskAssignees((currentAssignees) => [
      ...currentAssignees.filter((assignee) => assignee.task_id !== taskId),
      ...(insertResult.data as TaskAssignee[]),
    ])
    return true
  }

  async function replaceTaskLabels(taskId: string, labelIds: string[]) {
    const deleteResult = await supabase
      .from('task_labels')
      .delete()
      .eq('task_id', taskId)

    if (deleteResult.error) {
      setErrorMessage(deleteResult.error.message)
      return false
    }

    if (labelIds.length === 0) {
      setTaskLabels((currentLabels) =>
        currentLabels.filter((label) => label.task_id !== taskId),
      )
      return true
    }

    const labelRows = labelIds.map((labelId) => ({
      user_id: userId,
      task_id: taskId,
      label_id: labelId,
    }))

    const insertResult = await supabase
      .from('task_labels')
      .insert(labelRows)
      .select()

    if (insertResult.error) {
      setErrorMessage(insertResult.error.message)
      return false
    }

    setTaskLabels((currentLabels) => [
      ...currentLabels.filter((label) => label.task_id !== taskId),
      ...(insertResult.data as TaskLabel[]),
    ])
    return true
  }

  async function handleSaveTask(event: FormEvent) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (!trimmedTitle || !userId) return

    if (editingTaskId) {
      const updatePayload = {
        title: trimmedTitle,
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      }

      const updateResult = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', editingTaskId)
        .select()
        .single()

      if (updateResult.error) {
        setErrorMessage(updateResult.error.message)
        return
      }

      const assigneesSaved = await replaceTaskAssignees(
        editingTaskId,
        selectedAssigneeIds,
      )
      if (!assigneesSaved) return

      const labelsSaved = await replaceTaskLabels(editingTaskId, selectedLabelIds)
      if (!labelsSaved) return

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId ? (updateResult.data as Task) : task,
        ),
      )
      resetTaskForm()
      return
    }

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

    const createdTask = insertResult.data as Task

    const assigneesSaved = await replaceTaskAssignees(
      createdTask.id,
      selectedAssigneeIds,
    )
    if (!assigneesSaved) return

    const labelsSaved = await replaceTaskLabels(createdTask.id, selectedLabelIds)
    if (!labelsSaved) return

    setTasks((currentTasks) => [createdTask, ...currentTasks])
    resetTaskForm()
  }

  async function handleDeleteTask() {
    if (!editingTaskId) return

    const confirmed = window.confirm('Delete this task? This cannot be undone.')
    if (!confirmed) return

    const deleteResult = await supabase
      .from('tasks')
      .delete()
      .eq('id', editingTaskId)

    if (deleteResult.error) {
      setErrorMessage(deleteResult.error.message)
      return
    }

    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== editingTaskId),
    )
    setTaskAssignees((currentAssignees) =>
      currentAssignees.filter((assignee) => assignee.task_id !== editingTaskId),
    )
    setTaskLabels((currentLabels) =>
      currentLabels.filter((label) => label.task_id !== editingTaskId),
    )
    resetTaskForm()
  }

  async function handleCreateMember(event: FormEvent) {
    event.preventDefault()

    const trimmedName = newMemberName.trim()
    if (!trimmedName || !userId) return

    const member = {
      user_id: userId,
      name: trimmedName,
      avatar_color: avatarColors[members.length % avatarColors.length],
    }

    const insertResult = await supabase
      .from('team_members')
      .insert(member)
      .select()
      .single()

    if (insertResult.error) {
      setErrorMessage(insertResult.error.message)
      return
    }

    setMembers((currentMembers) => [
      ...currentMembers,
      insertResult.data as TeamMember,
    ])
    setNewMemberName('')
    setActiveQuickForm(null)
  }

  async function handleCreateLabel(event: FormEvent) {
    event.preventDefault()

    const trimmedName = newLabelName.trim()
    if (!trimmedName || !userId) return

    const label = {
      user_id: userId,
      name: trimmedName,
      color: labelColors[labels.length % labelColors.length],
    }

    const insertResult = await supabase
      .from('labels')
      .insert(label)
      .select()
      .single()

    if (insertResult.error) {
      setErrorMessage(insertResult.error.message)
      return
    }

    setLabels((currentLabels) => [...currentLabels, insertResult.data as Label])
    setNewLabelName('')
    setActiveQuickForm(null)
  }

  function toggleSelectedAssignee(memberId: string) {
    setSelectedAssigneeIds((currentIds) =>
      currentIds.includes(memberId)
        ? currentIds.filter((id) => id !== memberId)
        : [...currentIds, memberId],
    )
  }

  function toggleSelectedLabel(labelId: string) {
    setSelectedLabelIds((currentIds) =>
      currentIds.includes(labelId)
        ? currentIds.filter((id) => id !== labelId)
        : [...currentIds, labelId],
    )
  }

  function getTaskMembers(taskId: string) {
    const memberIds = new Set(
      taskAssignees
        .filter((assignee) => assignee.task_id === taskId)
        .map((assignee) => assignee.member_id),
    )

    return members.filter((member) => memberIds.has(member.id))
  }

  function getTaskLabels(taskId: string) {
    const labelIds = new Set(
      taskLabels
        .filter((label) => label.task_id === taskId)
        .map((label) => label.label_id),
    )

    return labels.filter((label) => labelIds.has(label.id))
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
        <div className="header-actions" aria-label="Board actions">
          <button type="button" onClick={openCreateTaskForm}>
            New task
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={openMemberForm}
          >
            Add member
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={openLabelForm}
          >
            Add tag
          </button>
        </div>
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

        <label>
          Assignee
          <select
            value={assigneeFilter}
            onChange={(event) => setAssigneeFilter(event.target.value)}
          >
            <option value="all">All assignees</option>
            {members.map((member) => (
              <option value={member.id} key={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tag
          <select
            value={labelFilter}
            onChange={(event) => setLabelFilter(event.target.value)}
          >
            <option value="all">All tags</option>
            {labels.map((label) => (
              <option value={label.id} key={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSearchQuery('')
            setPriorityFilter('all')
            setAssigneeFilter('all')
            setLabelFilter('all')
          }}
        >
          Clear filters
        </button>
      </section>

      {activeQuickForm === 'member' && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="member-form-title"
            aria-modal="true"
            className="task-form quick-form"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeQuickForm()
            }}
            onSubmit={handleCreateMember}
            role="dialog"
          >
            <div className="task-form-header">
              <div>
                <h2 id="member-form-title">Add team member</h2>
                <span>Use members as task assignees</span>
              </div>
              <button
                aria-label="Close team member form"
                className="icon-button"
                onClick={closeQuickForm}
                type="button"
              >
                &times;
              </button>
            </div>

            <label>
              Name
              <input
                autoFocus
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder="Team member name"
              />
            </label>

            {members.length > 0 && (
              <div className="resource-preview" aria-label="Current members">
                {members.map((member) => (
                  <span className="member-chip" key={member.id}>
                    <span
                      className="avatar"
                      style={{ backgroundColor: member.avatar_color }}
                    >
                      {getInitials(member.name)}
                    </span>
                    {member.name}
                  </span>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={closeQuickForm}>
                Cancel
              </button>
              <button type="submit">Add member</button>
            </div>
          </form>
        </div>
      )}

      {activeQuickForm === 'label' && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="label-form-title"
            aria-modal="true"
            className="task-form quick-form"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeQuickForm()
            }}
            onSubmit={handleCreateLabel}
            role="dialog"
          >
            <div className="task-form-header">
              <div>
                <h2 id="label-form-title">Add tag</h2>
                <span>Tags help filter and group work</span>
              </div>
              <button
                aria-label="Close tag form"
                className="icon-button"
                onClick={closeQuickForm}
                type="button"
              >
                &times;
              </button>
            </div>

            <label>
              Tag name
              <input
                autoFocus
                value={newLabelName}
                onChange={(event) => setNewLabelName(event.target.value)}
                placeholder="Tag name"
              />
            </label>

            {labels.length > 0 && (
              <div className="resource-preview" aria-label="Current tags">
                {labels.map((label) => (
                  <span className="label-chip" key={label.id}>
                    <span
                      className="label-dot"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            <div className="form-actions">
              <button type="button" onClick={closeQuickForm}>
                Cancel
              </button>
              <button type="submit">Add tag</button>
            </div>
          </form>
        </div>
      )}

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-modal="true"
            aria-labelledby="task-form-title"
            className="task-form"
            onKeyDown={(event) => {
              if (event.key === 'Escape') resetTaskForm()
            }}
            onSubmit={handleSaveTask}
            role="dialog"
          >
            <div className="task-form-header">
              <div>
                <h2 id="task-form-title">
                  {isEditing ? 'Edit task' : 'New task'}
                </h2>
                <span>
                  {isEditing ? 'Update fields and save' : 'Tasks start in To Do'}
                </span>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={resetTaskForm}
                aria-label="Close task form"
              >
                &times;
              </button>
            </div>

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

            {members.length > 0 && (
              <fieldset className="assignee-picker">
                <legend>Assignees</legend>
                <div>
                  {members.map((member) => (
                    <label key={member.id}>
                      <input
                        checked={selectedAssigneeIds.includes(member.id)}
                        onChange={() => toggleSelectedAssignee(member.id)}
                        type="checkbox"
                      />
                      <span
                        className="avatar"
                        style={{ backgroundColor: member.avatar_color }}
                      >
                        {getInitials(member.name)}
                      </span>
                      {member.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {labels.length > 0 && (
              <fieldset className="assignee-picker">
                <legend>Tags</legend>
                <div>
                  {labels.map((label) => (
                    <label key={label.id}>
                      <input
                        checked={selectedLabelIds.includes(label.id)}
                        onChange={() => toggleSelectedLabel(label.id)}
                        type="checkbox"
                      />
                      <span
                        className="label-dot"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="form-actions">
              {isEditing && (
                <button
                  className="danger-action"
                  type="button"
                  onClick={() => void handleDeleteTask()}
                >
                  Delete task
                </button>
              )}
              <button type="button" onClick={resetTaskForm}>
                Cancel
              </button>
              <button type="submit">
                {isEditing ? 'Save task' : 'Create task'}
              </button>
            </div>
          </form>
        </div>
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
                    onClick={() => {
                      if (!draggingTaskId) openEditTaskForm(task)
                    }}
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
                    {getTaskLabels(task.id).length > 0 && (
                      <div className="card-labels">
                        {getTaskLabels(task.id).map((label) => (
                          <span className="label-chip compact" key={label.id}>
                            <span
                              className="label-dot"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="card-footer">
                      <div className="avatar-stack">
                        {getTaskMembers(task.id).map((member) => (
                          <span
                            className="avatar"
                            key={member.id}
                            style={{ backgroundColor: member.avatar_color }}
                            title={member.name}
                          >
                            {getInitials(member.name)}
                          </span>
                        ))}
                      </div>
                      {getTaskMembers(task.id).length === 0 && (
                        <span className="muted-note">Unassigned</span>
                      )}
                    </div>
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
