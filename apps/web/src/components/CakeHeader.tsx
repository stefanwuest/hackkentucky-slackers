import { Link } from 'react-router-dom'

import cakeMyProspectLogo from '../assets/PPLogo.svg'

type CakeHeaderProps = {
  showHomeLink?: boolean
  homeLinkTo?: string
  homeLinkLabel?: string
  homeLinkState?: unknown
}

export function CakeHeader({ showHomeLink = false, homeLinkTo = '/', homeLinkLabel = 'Return to home', homeLinkState }: CakeHeaderProps) {
  return (
    <header className="page-header cake-home-header">
        {showHomeLink ? (
          <div className="cake-home-brand">
            <Link className="cake-header-home-link" to={homeLinkTo} state={homeLinkState} aria-label={homeLinkLabel} title={homeLinkLabel}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </Link>
           </div>
        ) : null}
      <h1>
        <img className="cake-home-logo" src={cakeMyProspectLogo} alt="Prospect Party, Powered by Zywave" />
      </h1>
      <p>Start the conversation today.</p>
    </header>
  )
}
