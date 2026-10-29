import { useCallback, useEffect } from 'react'

import { cloneObjects, copyObjects, pasteObjects } from './clipboard'
import { useCanvasShortcuts } from './useCanvasShortcuts'

import type { Tool } from './tools'
import type { useCanvasGraph } from './useCanvasGraph'
import type { useDesignHistory } from './useDesignHistory'
import type { DesignPage } from '../schema'
import type { useReactFlow } from '@xyflow/react'
import type { RefObject } from 'react'

type Args = {
  page: DesignPage | undefined
  pageId: string
  graph: ReturnType<typeof useCanvasGraph>
  history: ReturnType<typeof useDesignHistory>
  flow: ReturnType<typeof useReactFlow>
  containerRef: RefObject<HTMLDivElement | null>
  suspended: boolean
  setTool: (tool: Tool) => void
  setEditingId: (id: string | null) => void
  setInteractiveId: (id: string | null) => void
}

/** Clipboard, zoom and the keyboard that drives them. */
export function useCanvasController(a: Args) {
  const { page, graph, flow } = a

  const copy = useCallback(() => {
    if (page && graph.selectedObjects.length) copyObjects(graph.selectedObjects, page.links)
  }, [page, graph.selectedObjects])
  const paste = useCallback(() => {
    const { objects, links } = pasteObjects()

    if (objects.length) graph.addObjects(objects, links)
  }, [graph])
  const duplicate = useCallback(() => {
    if (!page || graph.selectedObjects.length === 0) return
    const { objects, links } = cloneObjects(graph.selectedObjects, page.links)

    graph.addObjects(objects, links)
  }, [page, graph])

  const fitAll = useCallback(
    () => void flow.fitView({ padding: 0.15, maxZoom: 1, duration: 200 }),
    [flow],
  )
  const fitSelection = useCallback(() => {
    const ids = [...graph.selectedIds]

    if (ids.length)
      void flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.3, duration: 200 })
  }, [flow, graph.selectedIds])

  useEffect(() => {
    const raf = requestAnimationFrame(fitAll)

    return () => cancelAnimationFrame(raf)
  }, [a.pageId, fitAll])

  const { setInteractiveId, setEditingId } = a
  const leaveModes = useCallback(() => {
    setInteractiveId(null)
    setEditingId(null)
  }, [setInteractiveId, setEditingId])

  useCanvasShortcuts({
    containerRef: a.containerRef,
    suspended: a.suspended,
    onEscape: () => {
      leaveModes()
      a.setTool('select')
    },
    onTool: a.setTool,
    undo: a.history.undo,
    redo: a.history.redo,
    copy,
    paste,
    duplicate,
    zoomIn: () => void flow.zoomIn({ duration: 150 }),
    zoomOut: () => void flow.zoomOut({ duration: 150 }),
    zoomTo: (z) => void flow.zoomTo(z, { duration: 150 }),
    fitAll,
    fitSelection,
  })

  return { fitAll, fitSelection, leaveModes, copy, paste, duplicate }
}
