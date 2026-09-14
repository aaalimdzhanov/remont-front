// Building JSON — единый источник истины для 2D Builder, Geometry Engine и Three.js.
// См. спецификацию проекта, разделы 8–17.

export interface Point2D {
  x: number
  z: number
}

export interface BuildingSchema {
  name: string
  version: string
}

export interface Project {
  id: string
  name: string
  status: 'draft' | 'active' | 'completed'
}

export interface Units {
  length: 'm'
  area: 'm2'
  volume: 'm3'
  angle: 'deg'
}

export interface Floor {
  id: string
  number: number
  elevation: number
  height: number
}

export interface RoomRectangleGeometry {
  type: 'rectangle'
  width: number
  length: number
  position: Point2D
  rotation: number
}

// Поддержка polygon предусмотрена схемой, но не реализуется на первом этапе.
export interface RoomPolygonGeometry {
  type: 'polygon'
  points: Point2D[]
}

export type RoomGeometry = RoomRectangleGeometry | RoomPolygonGeometry

export type RoomType =
  | 'kitchen'
  | 'living_room'
  | 'bedroom'
  | 'bathroom'
  | 'hallway'
  | 'other'

export interface Room {
  id: string
  floor_id: string
  name: string
  type: RoomType
  geometry: RoomGeometry
}

export type WallType = 'exterior' | 'interior'

export interface Wall {
  id: string
  floor_id: string
  type: WallType
  start: Point2D
  end: Point2D
  height: number
  thickness: number
  room_ids: string[]
}

export type OpeningType = 'window' | 'door'

export interface OpeningPosition {
  offset: number
  bottom: number
}

export interface OpeningDimensions {
  width: number
  height: number
}

export interface DoorSwing {
  direction: 'left' | 'right'
  angle: number
}

export interface Opening {
  id: string
  type: OpeningType
  wall_id: string
  dimensions: OpeningDimensions
  position: OpeningPosition
  swing?: DoorSwing
}

export type BuildingType = 'house' | 'apartment'

export interface Building {
  id: string
  type: BuildingType
  dimensions: {
    width: number
    length: number
  }
  floors: Floor[]
  rooms: Room[]
  walls: Wall[]
  openings: Opening[]
  stairs: unknown[]
  roof: unknown | null
  elements: unknown[]
}

export interface WorkRequirement {
  type: string
  scope: string
}

export interface BuildingDocument {
  schema: BuildingSchema
  project: Project
  units: Units
  building: Building
  work_requirements: WorkRequirement[]
  calculated: Record<string, unknown>
}
