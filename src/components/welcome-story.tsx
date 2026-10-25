"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { SenTrajetMark } from "@/components/sen-trajet-mark"

type Role = "client" | "chauffeur"

type Slide = {
  photo: string
  alt: string
  brush: string
  kicker: string
  title: string
  mark: string
  points: string[]
  focus: string
  place: string
}

const stories: Record<Role, Slide[]> = {
  client: [
    {
      photo: "/welcome/client.jpg",
      alt: "Elle regarde son téléphone sur un trottoir de Dakar, voiture claire derrière elle",
      brush: "LE PRIX",
      kicker: "Prix",
      title: "Fixé avant de monter.",
      mark: "avant",
      points: ["Le montant en FCFA, avant la voiture.", "Dakar, Thiès, Touba et les régions."],
      focus: "object-[center_22%]",
      place: "top-[16%] left-4 text-[3.15rem]",
    },
    {
      photo: "/welcome/route.jpg",
      alt: "Il monte dans une voiture claire sur la corniche",
      brush: "TA RUE",
      kicker: "Route",
      title: "On vient là où tu es.",
      mark: "là où tu es",
      points: ["Ta position, pas une adresse au hasard.", "Tu suis la voiture jusqu’au point."],
      focus: "object-[center_40%]",
      place: "top-[12%] left-4 text-[3.15rem]",
    },
    {
      photo: "/welcome/client.jpg",
      alt: "Elle confirme le trajet, le tissu wax et le mur derrière elle",
      brush: "CLAIR",
      kicker: "À bord",
      title: "Tu montes, c’est déjà clair.",
      mark: "déjà clair",
      points: ["Espèces, ou le solde du compte.", "Annuler reste libre avant l’arrivée."],
      focus: "object-[center_55%]",
      place: "top-[14%] left-4 text-[3.15rem]",
    },
  ],
  chauffeur: [
    {
      photo: "/welcome/chauffeur.jpg",
      alt: "Un chauffeur au volant, avenue de Dakar et mur graffiti",
      brush: "AU VOLANT",
      kicker: "Course",
      title: "La demande arrive avec le prix.",
      mark: "le prix",
      points: ["Tu vois le montant avant d’accepter.", "Tu pars seulement si ça te va."],
      focus: "object-[center_20%]",
      place: "top-[20%] right-3 text-right text-[2.45rem]",
    },
    {
      photo: "/welcome/route.jpg",
      alt: "Prise en charge sur la corniche, portière ouverte",
      brush: "LA COURSE",
      kicker: "Journée",
      title: "Tu roules, le montant est tenu.",
      mark: "tenu",
      points: ["Le passager connaît déjà le prix.", "Espèces ou solde, en fin de course."],
      focus: "object-[center_45%]",
      place: "top-[12%] left-4 text-[3.15rem]",
    },
  ],
}

export function WelcomeStory({ brushClass }: { brushClass: string }) {
  const [role, setRole] = useState<Role>("client")
  const [index, setIndex] = useState(0)
  const slides = stories[role]
  const slide = slides[index] ?? slides[0]
  const last = index === slides.length - 1

  function switchRole(next: Role) {
    setRole(next)
    setIndex(0)
  }

  return (
    <div className="min-h-dvh bg-[#0E2A24] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
        <section className="relative h-[50svh] min-h-72">
          <Image
            src={slide.photo}
            alt={slide.alt}
            fill
            priority={index === 0}
            sizes="(min-width: 32rem) 32rem, 100vw"
            className={`object-cover ${slide.focus}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0E2A24]/25 via-transparent to-[#0E2A24]" />
          <Motifs />
          <Doodles kind={slide.kicker} />
          <p
            className={`${brushClass} absolute z-10 max-w-[13rem] -rotate-6 leading-[0.9] text-[#FF4D2A] ${slide.place}`}
            style={{ WebkitTextStroke: "5px #fff", paintOrder: "stroke fill" }}
          >
            {slide.brush}
          </p>
          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 px-4 pt-4">
            <div className="rounded-full bg-white px-3 py-2 text-[#121417]">
              <SenTrajetMark onLight />
            </div>
            <Link
              href="/connexion"
              className="rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#121417]"
            >
              Passer
            </Link>
          </div>
        </section>

        <div className="flex flex-1 flex-col px-5 pt-1 pb-6">
          <p className="w-fit rounded-full bg-[#FF4D2A] px-2.5 py-1 text-[11px] font-bold tracking-[0.16em] text-white uppercase">
            {slide.kicker}
          </p>
          <h1 className="mt-3 max-w-[18rem] font-display text-[2.15rem] leading-[1.02] text-balance text-white">
            <Marked text={slide.title} mark={slide.mark} />
          </h1>
          <ul className="mt-4 flex flex-col gap-2.5">
            {slide.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[15px] leading-snug">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#FF4D2A]">
                  <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                    <path
                      d="M3 8.2 6.2 11.4 13 4.6"
                      fill="none"
                      stroke="#fff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3 pt-6">
            <div className="flex items-center gap-1.5" aria-hidden>
              {slides.map((item, dot) => (
                <span
                  key={item.brush}
                  className={dot === index ? "h-1.5 w-6 rounded-full bg-[#FF4D2A]" : "size-1.5 rounded-full bg-white/35"}
                />
              ))}
            </div>
            {last ? (
              <Link
                href={role === "chauffeur" ? "/chauffeur/inscription" : "/connexion?tab=signup"}
                className="grid h-12 place-items-center rounded-full bg-[#FF4D2A] text-base font-semibold text-white"
              >
                {role === "chauffeur" ? "Devenir chauffeur" : "Je me lance"}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((value) => value + 1)}
                className="grid h-12 place-items-center rounded-full bg-[#FF4D2A] text-base font-semibold text-white"
              >
                Suivant
              </button>
            )}
            {last ? (
              <Link
                href="/connexion"
                className="grid h-12 place-items-center rounded-full bg-white/10 text-base font-semibold text-white"
              >
                J’ai déjà un compte
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => switchRole(role === "client" ? "chauffeur" : "client")}
              className="py-1 text-sm font-medium text-white/80"
            >
              {role === "client" ? "Je conduis" : "Je suis passager"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Marked({ text, mark }: { text: string; mark: string }) {
  const at = text.indexOf(mark)
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <span className="text-[#FF4D2A] underline decoration-[#FF4D2A] decoration-[3px] underline-offset-[5px]">
        {mark}
      </span>
      {text.slice(at + mark.length)}
    </>
  )
}

function Motifs() {
  return (
    <>
      <svg viewBox="0 0 140 90" className="absolute top-12 left-0 z-10 w-28 opacity-90" aria-hidden>
        <path d="M0 8h92L46 88H0Z" fill="#0E8C78" />
        <path d="M18 0h48L42 52H0Z" fill="#FF4D2A" />
        <path d="M78 16h52L104 70H52Z" fill="#F3D5A0" />
      </svg>
      <svg viewBox="0 0 140 90" className="absolute top-14 right-0 z-10 w-24 opacity-90" aria-hidden>
        <path d="M140 6H48L94 86h46Z" fill="#FF4D2A" />
        <path d="M140 0H78L104 48h36Z" fill="#0E8C78" />
        <path d="M92 22H28l28 54h64Z" fill="#F3D5A0" />
      </svg>
    </>
  )
}

function Doodles({ kind }: { kind: string }) {
  return (
    <svg viewBox="0 0 360 520" className="absolute inset-0 z-10 h-full w-full" aria-hidden>
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
        <path d="M248 132c16-22 40-16 44 6 3 18-20 28-24 8" />
        <path d="M278 108l7-14M308 132l16 3M266 156l-7 12" />
      </g>
      <g fill="#FF4D2A">
        <path d="M292 186l5 12 12 2-10 7 3 12-10-7-10 7 3-12-10-7 10-2Z" />
        {kind === "Course" ? <circle cx="250" cy="168" r="6" /> : null}
      </g>
    </svg>
  )
}
