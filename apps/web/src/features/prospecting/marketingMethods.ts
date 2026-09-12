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
  imageSrc?: string
}

export const marketingMethods: MarketingMethod[] = [
  {
    id: 'cake',
    title: 'Deliver a cake',
    howItWorks: 'A cake iced with “Another year older. Another renewal.” Include a short personal note.',
    example: 'Time it ahead of a confirmed renewal planning window.',
    status: 'available',
    shortLabel: 'Cake',
    imageSrc: cakeDeliveryImage,
  },
  {
    id: 'miniature-marching-band',
    title: 'A miniature marching band',
    howItWorks: 'A short, prearranged performance celebrating the HR team.',
    example: '“Your benefits team deserves more fanfare.” Particularly suited to an employee appreciation event.',
    status: 'coming_soon',
    shortLabel: 'Band',
    imageSrc: mariachiBandImage,
  },
  {
    id: 'cameo-message',
    title: 'A personalized Cameo',
    howItWorks: 'Book a short celebrity-style video shoutout that names the company and renewal season.',
    example: 'Use it as a playful opener, then follow with one practical renewal planning takeaway.',
    status: 'coming_soon',
    shortLabel: 'Cameo',
    imageSrc: cameosImage,
  },
  {
    id: 'renewal-flowers',
    title: 'A renewal flower delivery',
    howItWorks: 'Send a bright bouquet with a concise note thanking the benefits team for the work ahead.',
    example: 'Pair the delivery with a simple timeline for getting ahead of renewal decisions.',
    status: 'coming_soon',
    shortLabel: 'Flowers',
    imageSrc: flowersImage,
  },
  {
    id: 'coffee-cart-custom-drinks',
    title: 'A coffee cart with custom drink names',
    howItWorks: 'Serve “The Open Enrollment Espresso” and “The Renewal Recovery Latte.”',
    example: 'Give HR credit for hosting the break; introduce the sponsoring broker clearly.',
    status: 'coming_soon',
    shortLabel: 'Coffee',
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
