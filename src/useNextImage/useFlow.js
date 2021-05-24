import { useRef, useState, useLayoutEffect, useMemo } from 'react'
import produce from 'immer'

const useFlow = ({ initialState, context, actions: actionsConfig, helpers = {} }) => {
  const [produceNewStateChangeCount, setProduceNewStateChangeCount] = useState(0)

  const contextRef = useRef(Object.seal(context))
  const stateRef = useRef(Object.seal(initialState))

  const getContext = () => contextRef.current
  const getState = () => stateRef.current

  const isMountedRef = useRef(true)
  useLayoutEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useLayoutEffect(() => {
    contextRef.current = context
  })

  const setState = newState => {
    stateRef.current = newState
    setProduceNewStateChangeCount(count => count + 1)
  }

  const produceNewState = stateProducer => {
    if (isMountedRef.current === false) {
      console.error('memory leak error')
      return
    }
    setState(produce(getState(), stateProducer))
  }

  // Enables nesting, i.e. actions.updateUser() can trigger actions.clearUser() via the argument
  const actions = {}
  const actionArguments = {
    getState,
    getContext,
    produceNewState,
    actions,
    helpers,
  }
  const createdActions = actionsConfig(actionArguments)
  Object.keys(createdActions).forEach(key => {
    actions[key] = createdActions[key]
  })

  // Without memoization, both the state and actions would appear to have changed every time
  // a useFlow component or hook renders. See useCallback and useMemo docs for more information.
  const memoizedState = useMemo(() => stateRef.current, [produceNewStateChangeCount])
  const memoizedActions = useMemo(() => actions, [])

  return { state: memoizedState, actions: memoizedActions }
}

export default useFlow
