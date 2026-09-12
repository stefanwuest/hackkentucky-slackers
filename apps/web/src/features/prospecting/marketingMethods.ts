import cakeDeliveryImage from '../../assets/methods/cake-delivery.png'
import cameosImage from '../../assets/methods/cameos.png'
import coffeeCartImage from '../../assets/methods/coffee-cart.png'
import flowersImage from '../../assets/methods/flowers.png'
import mariachiBandImage from '../../assets/methods/mariachi-band.png'

export type MarketingMethod = {
  id: string
  title: string
  howItWorks: string
  example: string
  status: 'available' | 'coming_soon'
  shortLabel: string
  proofMetric: string
  proofReason: string
  imageSrc?: string
}

export const marketingMethods: MarketingMethod[] = [
  {
    id: 'cake',
    title: 'Deliver a tailored cake',
    howItWorks: 'Generate a company-specific cake message from the prospect’s renewal timing and benefits context, then send it as a memorable opener.',
    example: 'Use the tailored message to start the renewal conversation before the planning window gets crowded.',
    status: 'available',
    shortLabel: 'Cake',
    proofMetric: '100%',
    proofReason: 'open rate — it has to be received in person.',
    imageSrc: cakeDeliveryImage,
  },
  {
    id: 'miniature-marching-band',
    title: 'A miniature marching band',
    howItWorks: 'Arrange a short, preplanned performance that gives the HR team a little well-earned fanfare.',
    example: 'Best near an employee appreciation moment, with a clear sponsor intro after the applause.',
    status: 'coming_soon',
    shortLabel: 'Band',
    proofMetric: '30 sec',
    proofReason: 'of fanfare makes the HR team the moment.',
    imageSrc: mariachiBandImage,
  },
  {
    id: 'cameo-message',
    title: 'A personalized Cameo',
    howItWorks: 'Book a short celebrity-style shoutout tailored to the company, HR team, and renewal season.',
    example: 'Use it as a playful opener, then follow with one practical renewal planning takeaway.',
    status: 'coming_soon',
    shortLabel: 'Cameo',
    proofMetric: '1:1',
    proofReason: 'video gives the outreach a face and a name.',
    imageSrc: cameosImage,
  },
  {
    id: 'renewal-flowers',
    title: 'A renewal flower delivery',
    howItWorks: 'Send a bright bouquet with a concise, appreciative note for the benefits team’s work ahead.',
    example: 'Pair the delivery with a simple timeline for getting ahead of renewal decisions.',
    status: 'coming_soon',
    shortLabel: 'Flowers',
    proofMetric: '1 delivery',
    proofReason: 'keeps the message visible after the first read.',
    imageSrc: flowersImage,
  },
  {
    id: 'coffee-cart-custom-drinks',
    title: 'A coffee cart with custom drink names',
    howItWorks: 'Bring in a coffee cart with renewal-themed drinks named for the company or benefits team.',
    example: 'Give HR credit for hosting the break, then introduce the sponsoring broker clearly.',
    status: 'coming_soon',
    shortLabel: 'Coffee',
    proofMetric: '20 min',
    proofReason: 'team break earns attention before the pitch.',
    imageSrc: coffeeCartImage,
  },
  // Hidden until matching image assets are available:
  // {
  //   id: 'ice-cream-cart',
  //   title: 'An ice cream cart',
  //   howItWorks: 'Arrange a brief office visit: “Benefits shouldn’t give you a meltdown.”',
  //   example: 'Sponsor a team break and offer HR a useful renewal planning sheet.',
  //   status: 'coming_soon',
  //   shortLabel: 'Cream',
  // },
  // {
  //   id: 'singing-telegram',
  //   title: 'A singing telegram',
  //   howItWorks: 'A performer delivers a 30-second, company-specific song about renewal season.',
  //   example: 'End with one clear introduction to the broker—not a full sales pitch.',
  //   status: 'coming_soon',
  //   shortLabel: 'Song',
  // },
  // {
  //   id: 'break-glass-before-renewal',
  //   title: 'A “break glass before renewal” box',
  //   howItWorks: 'An acrylic display box containing coffee, chocolate, and a renewal checklist. No actual glass-breaking required.',
  //   example: 'Make the checklist specific to what you found in their filings.',
  //   status: 'coming_soon',
  //   shortLabel: 'Box',
  // },
  // {
  //   id: 'custom-board-game',
  //   title: 'A custom board game',
  //   howItWorks: 'Send a small “Renewal Season” game: collect census data, chase quotes, survive open enrollment.',
  //   example: 'Personalize a few squares to their industry and company.',
  //   status: 'coming_soon',
  //   shortLabel: 'Game',
  // },
  // {
  //   id: 'caricature-artist-pop-up',
  //   title: 'A caricature artist pop-up',
  //   howItWorks: 'Offer a short session drawing employees as superheroes.',
  //   example: 'Frame it as appreciation for the people who keep benefits running.',
  //   status: 'coming_soon',
  //   shortLabel: 'Art',
  // },
  // {
  //   id: 'giant-fortune-cookie',
  //   title: 'A giant fortune cookie',
  //   howItWorks: 'The fortune reads: “Your next renewal starts with better questions.”',
  //   example: 'Include three thoughtful questions based on the account research.',
  //   status: 'coming_soon',
  //   shortLabel: 'Luck',
  // },
  // {
  //   id: 'magician-at-lunch',
  //   title: 'A magician at lunch',
  //   howItWorks: 'Arrange a short performance around disappearing paperwork and multiplying forms.',
  //   example: 'Connect it to reducing HR’s administrative workload. Avoid disappearing-premium promises.',
  //   status: 'coming_soon',
  //   shortLabel: 'Magic',
  // },
  // {
  //   id: 'custom-pinata',
  //   title: 'A custom piñata',
  //   howItWorks: 'A desk-size piñata labeled “Renewal Stress,” filled with individually wrapped treats.',
  //   example: 'Attach a practical timeline for getting ahead of renewal.',
  //   status: 'coming_soon',
  //   shortLabel: 'Treat',
  // },
  // {
  //   id: 'fake-newspaper',
  //   title: 'A fake newspaper—with an obvious playful label',
  //   howItWorks: 'Print a company-specific front page: “Local HR Team Completes Open Enrollment, Deserves Vacation.” Deliver with pastries.',
  //   example: 'Celebrate the buyer’s work and introduce your support offering.',
  //   status: 'coming_soon',
  //   shortLabel: 'News',
  // },
]
