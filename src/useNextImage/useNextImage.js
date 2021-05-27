import { useContext, useEffect } from 'react'
import loadImageElement from './loadImageElement'
import bufferAlgorithm, { MAXIMUM_IMAGE_BUFFER_COUNT } from './bufferAlgorithm'
import useFlow from './useFlow'
import { InitialImageContext } from './InitialImageProvider'

const useNextImage = () => {
  const { initialImage } = useContext(InitialImageContext) || {}
  const {
    state: { loadedImages, imageElement },
    actions: { getNext, loadMore, replaceImageIfAvailable },
  } = useFlow({
    initialState: {
      imageElement: initialImage,
      loadingImages: [],
      loadedImages: [],
      viewedImageCount: 0,
    },
    actions: useNextImage.actions,
  })

  const isLoading = !imageElement

  useEffect(() => {
    loadMore()
  }, [])

  useEffect(() => {
    if (isLoading && loadedImages.length) {
      replaceImageIfAvailable() // Image now available
    }
  }, [isLoading, loadedImages.length])

  return { imageElement, isLoading, getNext }
}

useNextImage.actions = ({ getState, produceNewState, actions, unmountable }) => ({
  getNext: () => {
    actions.replaceImageIfAvailable()
    actions.loadMore()
  },

  loadMore: () => {
    const { viewedImageCount, loadingImages, loadedImages } = getState()

    // When all images are stuck loading, try again with a fresh request
    if (loadingImages.length >= MAXIMUM_IMAGE_BUFFER_COUNT && loadedImages.length === 0) {
      actions.cycleLoadingImage()
      return
    }

    const numberOfImagesToLoad = bufferAlgorithm(
      viewedImageCount,
      loadingImages.length + loadedImages.length
    )

    for (let i = 0; i < numberOfImagesToLoad; i += 1) {
      actions.loadImage()
    }
  },

  loadImage: async () => {
    const imagePromise = unmountable(loadImageElement())
    produceNewState(state => {
      state.loadingImages.push(imagePromise)
    })

    let imageElement
    // try {
    imageElement = await imagePromise
    // } catch (error) {
    //   if (error.message && error.message.includes('Failed to fetch')) {
    //     produceNewState(state => {
    //       state.loadingImages = state.loadingImages.filter(each => each !== imagePromise)
    //     })
    //     return
    //   }
    //   throw error
    // }

    produceNewState(state => {
      state.loadingImages = state.loadingImages.filter(each => each !== imagePromise)
      state.loadedImages.push(imageElement)
    })
  },

  cycleLoadingImage: () => {
    produceNewState(state => {
      state.loadingImages.shift()
    })
    actions.loadImage()
  },

  replaceImageIfAvailable: () => {
    produceNewState(state => {
      state.imageElement = state.loadedImages.shift()
      if (state.imageElement) {
        state.viewedImageCount += 1
      }
    })
  },
})

export default useNextImage
