import * as React from 'react'
import cx from 'classnames'

import styles from './styles.css'

export interface PageProps {
  scrollRef: React.RefObject<HTMLDivElement>
  detailPage: boolean
  sidebar: React.ReactNode
  content: React.ReactNode
}

export function Page(props: PageProps): JSX.Element {
  const { scrollRef, detailPage, sidebar, content } = props

  return (
    <div className={styles.page}>
      <div className={styles.content_scroller} ref={scrollRef}>
        <div className={styles.content_width_limiter}>
          <div
            className={cx(styles.sidebar_container, {
              [styles.is_detail_page]: detailPage,
            })}
          >
            {sidebar}
          </div>
          <section
            className={cx(styles.content_container, {
              [styles.is_detail_page]: detailPage,
            })}
          >
            {content}
          </section>
        </div>
      </div>
    </div>
  )
}
