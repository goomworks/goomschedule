"use client";
import {create, StateCreator, StoreApi, useStore} from 'zustand'
import {devtools, persist} from 'zustand/middleware'
import {DateTime} from "luxon";
import type {} from '@redux-devtools/extension'
import {createStore} from "zustand/vanilla";

export type Template = {
  date: DateTime | string,
  time?: string
  description?: string
}

export type ScheduleState = {
  startingDate: DateTime | string,
  totalStreams: number,
  timeZones: string[],
  templates: Template[],
}

export type ScheduleStateReducers = {
  resetTemplate: () => void,
  setStartingDate: (startingDate: DateTime, templates: Template[]) => void,
  setTotalStreams: (totalStreams: number, startingDate: DateTime) => void,
  setTimeZones: (timeZones: string[]) => void,
  setTemplates: (templates: Template[]) => void,
  setTemplate: (index: number, templates: Template) => void,
  removeTemplate: (index: number) => void,
  addTemplateAfter: (index: number, template: Template) => void
}

let initialState: ScheduleState = {
  startingDate: DateTime.local(),
  totalStreams: 1,
  timeZones: [],
  templates: [{date: DateTime.local()}],
}

let reducers: StateCreator<ScheduleStateReducers & ScheduleState, [["zustand/devtools", never]], [], ScheduleStateReducers> =
  (set, get) => ({
    resetTemplate: () => set((state) => ({...initialState})),
    setStartingDate: (startingDate: DateTime, templates: Template[]) => set((state) => {
      return {
        startingDate,
        ...(templates.length > 0 && {
          templates: templates.map((value, index) => ({
            ...value,
            date: startingDate.plus({ days: index }),
          }))
        })
      }
    }),
    setTotalStreams: (totalStreams: number, startingDate: DateTime) => set((state) => {
      if (totalStreams < 0)
        throw new RangeError("Can't set total number of streams to less than 0!")

      return {
        totalStreams,
        templates: [...Array(totalStreams).keys()].map(index => state.templates[index] ?? {date: startingDate.plus({ days: index })})
      }
    }),
    setTimeZones: (timeZones: string[]) => set((state) => ({timeZones: timeZones})),
    setTemplates: (templates: Template[]) => set((state) => {
      return {
        totalStreams: templates.length,
        templates
      }
    }),
    setTemplate: (index: number, template: Template) => set((state) => {
      if (index > state.templates.length || index < 0)
        throw new RangeError("Template is out of range!")

      return {
        templates: [...state.templates.slice(0, index), template, ...state.templates.slice(index + 1, state.templates.length)]
      }
    }),
    removeTemplate: (index: number) => set((state) => {
      if (index > state.templates.length || index < 0)
        throw new RangeError("Template is out of range!")

      return {
        totalStreams: state.totalStreams - 1,
        templates: [...state.templates.slice(0, index), ...state.templates.slice(index + 1, state.templates.length)]
      }
    }),
    addTemplateAfter: (index: number, template: Template) => set((state) => {
      if (index > state.templates.length || index < 0)
        throw new RangeError("Template is out of range!")

      return {
        totalStreams: state.totalStreams + 1,
        templates: [...state.templates.slice(0, index + 1), template, ...state.templates.slice(index + 1, state.templates.length)]
      }
    })
  })

export const scheduleStore = createStore<ScheduleState & ScheduleStateReducers>()(
  devtools(
    persist(
      (...initializers) => ({
        ...initialState,
        ...reducers(...initializers)
      }),
      {
        name: 'schedule-storage'
      })))

type ExtractState<S> = S extends { getState: () => infer X } ? X : never

const createBoundedUseStore = ((store) => (selector) => useStore(store)) as <
  S extends StoreApi<unknown>,
>(
  store: S,
) => {
  (): ExtractState<S>
  <T>(selector: (state: ExtractState<S>) => T): T
}

const useScheduleStore = createBoundedUseStore(scheduleStore)

export default useScheduleStore
