import cakeMyProspectLogo from '../assets/PPLogo.svg'

export function CakeHeader() {
  return (
    <header className="page-header cake-home-header">
      <h1>
        <img className="cake-home-logo" src={cakeMyProspectLogo} alt="Prospect Party, Powered by Zywave" />
      </h1>
      <p>Start the conversation today.</p>
    </header>
  )
}
