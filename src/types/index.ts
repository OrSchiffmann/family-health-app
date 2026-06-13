export type TaskType = 'done_not_done' | 'duration'
export type CadencePer = 'day' | 'week' | 'month'
export type FirstDayOfWeek = 'saturday' | 'sunday' | 'monday'
export type FamilyRole = 'admin' | 'editor' | 'user' | 'viewer'
export type AttachmentType = 'image' | 'video' | 'youtube' | 'link'
export type Language = 'he' | 'en'

export interface Family {
  id: string
  name: string
  createdAt: string
  firstDayOfWeek: FirstDayOfWeek
}

export interface Member {
  id: string
  familyId: string
  name: string
  avatarColor: string
  isArchived: boolean
  createdAt: string
}

export interface Category {
  id: string
  memberId: string
  name: string
  color: string
  isDefault: boolean
  sortOrder: number
  subcategories: Subcategory[]
}

export interface Subcategory {
  id: string
  categoryId: string
  name: string
  sortOrder: number
}

export interface Tag {
  id: string
  familyId: string
  name: string
  color: string | null
}

export interface Attachment {
  id: string
  taskId: string
  type: AttachmentType
  url: string
  title: string | null
  thumbnailUrl: string | null
}

export interface CadenceVersion {
  id: string
  taskId: string
  effectiveFrom: string
  targetCount: number | null
  targetMinutes: number | null
  per: CadencePer
}

export interface Task {
  id: string
  familyId: string
  title: string
  assignedMembers: string[]
  categoryId: string
  subcategoryId: string | null
  taskType: TaskType
  description: string | null
  mediaAttachments: Attachment[]
  tags: Tag[]
  cadenceVersions: CadenceVersion[]
  endDate: string | null
  isArchived: boolean
  createdAt: string
  createdBy: string
}

export interface LogEntry {
  id: string
  taskId: string
  memberId: string
  loggedBy: string
  loggedAt: string
  executionTime: string | null
  cadenceVersionId: string
  completed: boolean
  durationMinutes: number | null
  durationSeconds: number | null
  notes: string | null
  tags: string[]
}

export interface FamilyUser {
  id: string
  familyId: string
  userId: string
  role: FamilyRole
  displayName: string
  email: string
  joinedAt: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  language: Language
  avatarUrl: string | null
}

// Enriched types for UI
export interface TaskWithDetails extends Task {
  category: Category
  subcategory: Subcategory | null
  members: Member[]
}

export interface CadenceProgress {
  target: number
  achieved: number
  per: CadencePer
  taskType: TaskType
}
