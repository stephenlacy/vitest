import type { BrowserPage, UserEventClearOptions, UserEventClickOptions, UserEventDragAndDropOptions, UserEventFillOptions, UserEventHoverOptions, UserEventSelectOptions, UserEventUploadOptions } from '@vitest/browser/context'
import { page, server } from '@vitest/browser/context'
import {
  getByAltTextSelector,
  getByLabelSelector,
  getByPlaceholderSelector,
  getByRoleSelector,
  getByTestIdSelector,
  getByTextSelector,
  getByTitleSelector,
} from 'ivya'
import { getIframeScale, processTimeoutOptions } from '../utils'
import { Locator, selectorEngine } from './index'

page.extend({
  getByLabelText(text, options) {
    return new PlaywrightLocator(getByLabelSelector(text, options))
  },
  getByRole(role, options) {
    return new PlaywrightLocator(getByRoleSelector(role, options))
  },
  getByTestId(testId) {
    return new PlaywrightLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId))
  },
  getByAltText(text, options) {
    return new PlaywrightLocator(getByAltTextSelector(text, options))
  },
  getByPlaceholder(text, options) {
    return new PlaywrightLocator(getByPlaceholderSelector(text, options))
  },
  getByText(text, options) {
    return new PlaywrightLocator(getByTextSelector(text, options))
  },
  getByTitle(title, options) {
    return new PlaywrightLocator(getByTitleSelector(title, options))
  },

  _createLocator(selector: string) {
    return new PlaywrightLocator(selector)
  },
  elementLocator(element: Element) {
    return new PlaywrightLocator(
      selectorEngine.generateSelectorSimple(element),
      element,
    )
  },

  // iframe support
  createFramePage(frameElement: Element | Locator) {
    const iframeElement = frameElement instanceof Element ? frameElement : frameElement.element()
    if (!(iframeElement instanceof HTMLIFrameElement)) {
      throw new TypeError('Expected frameElement to be an iframe element')
    }

    const iframeDocument = iframeElement.contentWindow?.document || iframeElement.contentDocument
    if (!iframeDocument) {
      throw new Error('Could not access iframe content document')
    }

    function createIframeLocator(selector: string): Locator {
      const baseLocator = new PlaywrightLocator(selector)

      const locator = Object.create(baseLocator) as Locator

      locator.query = function (): Element | null {
        const parsedSelector = selectorEngine.parseSelector(selector)
        if (iframeDocument) {
          return selectorEngine.querySelector(parsedSelector, iframeDocument.documentElement, true)
        }
        return null
      }

      locator.elements = function (): Element[] {
        const parsedSelector = selectorEngine.parseSelector(selector)
        if (iframeDocument) {
          return selectorEngine.querySelectorAll(parsedSelector, iframeDocument.documentElement)
        }
        return []
      }

      return locator
    }

    const framePage = Object.create(page) as BrowserPage

    framePage._createLocator = createIframeLocator
    framePage.getByRole = (role, options) =>
      createIframeLocator(getByRoleSelector(role, options))
    framePage.getByLabelText = (text, options) =>
      createIframeLocator(getByLabelSelector(text, options))
    framePage.getByTestId = testId =>
      createIframeLocator(getByTestIdSelector(server.config.browser.locators.testIdAttribute, testId))
    framePage.getByAltText = (text, options) =>
      createIframeLocator(getByAltTextSelector(text, options))
    framePage.getByPlaceholder = (text, options) =>
      createIframeLocator(getByPlaceholderSelector(text, options))
    framePage.getByText = (text, options) =>
      createIframeLocator(getByTextSelector(text, options))
    framePage.getByTitle = (title, options) =>
      createIframeLocator(getByTitleSelector(title, options))

    return framePage
  },
})

class PlaywrightLocator extends Locator {
  constructor(public selector: string, protected _container?: Element) {
    super()
  }

  public override click(options?: UserEventClickOptions) {
    return super.click(processTimeoutOptions(processClickOptions(options)))
  }

  public override dblClick(options?: UserEventClickOptions): Promise<void> {
    return super.dblClick(processTimeoutOptions(processClickOptions(options)))
  }

  public override tripleClick(options?: UserEventClickOptions): Promise<void> {
    return super.tripleClick(processTimeoutOptions(processClickOptions(options)))
  }

  public override selectOptions(
    value: HTMLElement | HTMLElement[] | Locator | Locator[] | string | string[],
    options?: UserEventSelectOptions,
  ): Promise<void> {
    return super.selectOptions(value, processTimeoutOptions(options))
  }

  public override clear(options?: UserEventClearOptions): Promise<void> {
    return super.clear(processTimeoutOptions(options))
  }

  public override hover(options?: UserEventHoverOptions): Promise<void> {
    return super.hover(processTimeoutOptions(processHoverOptions(options)))
  }

  public override upload(
    files: string | string[] | File | File[],
    options?: UserEventUploadOptions,
  ): Promise<void> {
    return super.upload(files, processTimeoutOptions(options))
  }

  public override fill(text: string, options?: UserEventFillOptions): Promise<void> {
    return super.fill(text, processTimeoutOptions(options))
  }

  public override dropTo(target: Locator, options?: UserEventDragAndDropOptions): Promise<void> {
    return super.dropTo(target, processTimeoutOptions(
      processDragAndDropOptions(options),
    ))
  }

  protected locator(selector: string) {
    return new PlaywrightLocator(`${this.selector} >> ${selector}`, this._container)
  }

  protected elementLocator(element: Element) {
    return new PlaywrightLocator(
      selectorEngine.generateSelectorSimple(element),
      element,
    )
  }
}

function processDragAndDropOptions(options_?: UserEventDragAndDropOptions) {
  if (!options_) {
    return options_
  }
  const options = options_ as NonNullable<
    Parameters<import('playwright').Page['dragAndDrop']>[2]
  >
  if (options.sourcePosition) {
    options.sourcePosition = processPlaywrightPosition(options.sourcePosition)
  }
  if (options.targetPosition) {
    options.targetPosition = processPlaywrightPosition(options.targetPosition)
  }
  return options_
}

function processHoverOptions(options_?: UserEventHoverOptions) {
  if (!options_) {
    return options_
  }
  const options = options_ as NonNullable<
    Parameters<import('playwright').Page['hover']>[1]
  >
  if (options.position) {
    options.position = processPlaywrightPosition(options.position)
  }
  return options_
}

function processClickOptions(options_?: UserEventClickOptions) {
  if (!options_) {
    return options_
  }
  const options = options_ as NonNullable<
    Parameters<import('playwright').Page['click']>[1]
  >
  if (options.position) {
    options.position = processPlaywrightPosition(options.position)
  }
  return options
}

function processPlaywrightPosition(position: { x: number; y: number }) {
  const scale = getIframeScale()
  if (position.x != null) {
    position.x *= scale
  }
  if (position.y != null) {
    position.y *= scale
  }
  return position
}
