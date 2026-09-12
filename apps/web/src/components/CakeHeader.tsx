import { Link } from 'react-router-dom'

import cakeMyProspectLogo from '../assets/cakemyprospect-logo.svg'

export function CakeHeader({ showHomeLink = false }: { showHomeLink?: boolean }) {
  return (
    <header className="page-header cake-home-header">
      <div className="cake-home-brand">
        {showHomeLink ? (
          <Link className="cake-header-home-link" to="/" aria-label="Return to home" title="Return to home">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
        ) : null}
        <h1>
          <img className="cake-home-logo" src={cakeMyProspectLogo} alt="Cake my prospect" />
        </h1>
      </div>
      <p>Find renewal signals, then turn a prospect into a cake-worthy conversation starter.</p>
    </header>
  )
}
