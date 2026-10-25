import { Rubik_Wet_Paint } from "next/font/google"
import { WelcomeStory } from "@/components/welcome-story"

const brush = Rubik_Wet_Paint({
  weight: "400",
  subsets: ["latin"],
})

export function WelcomeFlow() {
  return <WelcomeStory brushClass={brush.className} />
}
