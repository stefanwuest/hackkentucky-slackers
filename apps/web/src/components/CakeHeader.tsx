import cakeMyProspectLogo from '../assets/cakemyprospect-logo.svg'

export function CakeHeader() {
  return (
    <header className="page-header cake-home-header">
      <h1>
        <img className="cake-home-logo" src={cakeMyProspectLogo} alt="Cake my prospect" />
      </h1>
      <p>Find renewal signals, then turn a prospect into a cake-worthy conversation starter.</p>
    </header>
  )
}
