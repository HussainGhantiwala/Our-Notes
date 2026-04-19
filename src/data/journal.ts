// Mock data for the journal. Easily swappable with a backend later.

import memory1 from "@/assets/memory-1.jpg";
import memory2 from "@/assets/memory-2.jpg";
import memory3 from "@/assets/memory-3.jpg";
import memory4 from "@/assets/memory-4.jpg";

export type Mood = "🌸" | "💌" | "✨" | "🌙" | "☕" | "🌿";

export interface Chapter {
  id: string;
  number: number;
  title: string;
  date: string;
  mood: Mood;
  preview: string;
  paperVariant: "blush" | "lavender" | "peach" | "sage" | "blue";
  pages: { left: string[]; right: string[]; photo?: string; photoCaption?: string };
}

export const chapters: Chapter[] = [
  {
    id: "how-we-began",
    number: 1,
    title: "How We Began",
    date: "Spring",
    mood: "🌸",
    preview: "The first hello that changed everything. A nervous laugh, an extra-long glance, and the quiet feeling of: oh, there you are.",
    paperVariant: "blush",
    pages: {
      left: [
        "I keep coming back to that first day.",
        "You walked in like you had no idea what you were about to do to my whole year.",
        "I remember the exact light. The exact song. The way I tried to act normal and absolutely failed.",
      ],
      right: [
        "I didn't know yet that you'd become the person I tell everything to.",
        "I just knew my heart did a small, ridiculous thing — and it hasn't really stopped since.",
        "If life is a book, you are the chapter I keep re-reading.",
      ],
      photo: memory1,
      photoCaption: "the day everything began",
    },
  },
  {
    id: "month-i-missed-you",
    number: 2,
    title: "The Month I Missed You Most",
    date: "Summer",
    mood: "🌙",
    preview: "Distance taught me what your laugh sounds like in my head, and how loud silence gets without you in it.",
    paperVariant: "lavender",
    pages: {
      left: [
        "Some days felt like waiting rooms.",
        "I'd reach for my phone before I was even awake — just to see your name appear.",
        "Missing you became its own kind of love language.",
      ],
      right: [
        "I learned that a person can live in a city you've never visited, and still feel like home.",
        "Every coffee tasted a little lonelier. Every sunset a little louder.",
        "But every 'goodnight' from you stitched the day back together.",
      ],
      photo: memory2,
      photoCaption: "two cups, one of them yours in spirit",
    },
  },
  {
    id: "tiny-moments",
    number: 3,
    title: "Tiny Moments I Loved",
    date: "Autumn",
    mood: "✨",
    preview: "Not the grand ones. The small ones. The way you hum without noticing. The way you say my name when you're sleepy.",
    paperVariant: "peach",
    pages: {
      left: [
        "The way you steal a fry and pretend you didn't.",
        "Your sleepy voice in the morning.",
        "That specific laugh — the one only the dumbest jokes get.",
      ],
      right: [
        "How you tuck your hair behind your ear when you're concentrating.",
        "The pause you make before saying something kind.",
        "Tiny. All of it. And somehow the whole reason I'm so soft for you.",
      ],
      photo: memory3,
      photoCaption: "a field of small forevers",
    },
  },
  {
    id: "still-choosing-you",
    number: 4,
    title: "Still Choosing You",
    date: "Winter",
    mood: "💌",
    preview: "Through good days, hard days, lazy Sundays, and the kind of quiet that only exists with someone you love.",
    paperVariant: "blue",
    pages: {
      left: [
        "Today, again.",
        "Tomorrow, probably also.",
        "On the days you're tired of yourself, I'll choose you twice.",
      ],
      right: [
        "Love isn't only the fireworks. It's the choosing.",
        "It's me, picking your favorite snack at the store without thinking.",
        "It's you, every day, in a hundred tiny yeses.",
      ],
      photo: memory4,
      photoCaption: "fairy lights & soft nights",
    },
  },
];

export const galleryPhotos = [
  { id: "g1", src: memory1, caption: "the letter I wrote you", rotate: -3 },
  { id: "g2", src: memory2, caption: "our slow morning", rotate: 2 },
  { id: "g3", src: memory3, caption: "wildflowers, like you", rotate: -1.5 },
  { id: "g4", src: memory4, caption: "the night I knew", rotate: 3 },
  { id: "g5", src: memory1, caption: "soft pages, soft days", rotate: 1 },
  { id: "g6", src: memory3, caption: "every sunset since", rotate: -2.5 },
];

export interface Flower {
  id: string;
  name: string;
  color: string;
  message: string;
  emoji: string;
}

export const bouquetFlowers: Flower[] = [
  { id: "rose", name: "Rose", color: "hsl(var(--rose))", message: "You made me feel loved in a way I'd stopped believing was real.", emoji: "🌹" },
  { id: "sunflower", name: "Sunflower", color: "hsl(48 90% 65%)", message: "You made my dark days bright. Even on the hardest mornings.", emoji: "🌻" },
  { id: "tulip", name: "Tulip", color: "hsl(350 70% 75%)", message: "I admire your soul. Quietly. Constantly. Completely.", emoji: "🌷" },
  { id: "daisy", name: "Daisy", color: "hsl(48 80% 90%)", message: "Loving you is the easiest yes I've ever said.", emoji: "🌼" },
  { id: "lavender", name: "Lavender", color: "hsl(var(--lavender))", message: "You are my calm. My slow exhale. My favorite quiet.", emoji: "💜" },
  { id: "cherry", name: "Cherry Blossom", color: "hsl(var(--blush))", message: "Even short seasons with you feel like the whole spring.", emoji: "🌸" },
];

export interface LoveNote {
  id: string;
  short: string;
  full: string;
  color: "yellow" | "pink" | "mint" | "blue" | "lavender" | "peach";
}

export const loveNotes: LoveNote[] = [
  { id: "n1", short: "I replay this day a lot.", full: "That ordinary Tuesday. The walk home. The way you held my hand without thinking about it. I replay it more than you'd believe.", color: "yellow" },
  { id: "n2", short: "You looked beautiful here.", full: "Not in a posed way. In the sleepy, real, mid-laugh way. The kind I wish I could take a picture of with my whole chest.", color: "pink" },
  { id: "n3", short: "Still smiling about this.", full: "Whatever silly thing you said — yeah, that one. I think about it at random and accidentally smile in public. You're a menace.", color: "mint" },
  { id: "n4", short: "I'm so proud of you.", full: "I don't say this enough out loud. Watching you be brave, even quietly, is one of my favorite things to witness.", color: "lavender" },
  { id: "n5", short: "You make me softer.", full: "I used to think I had to be sharp to be safe. You taught me I can be gentle and still be okay.", color: "peach" },
  { id: "n6", short: "Thank you for this life.", full: "For the small one. The one with breakfast and grocery runs and our weird inside jokes. It is, and always will be, enough.", color: "blue" },
  { id: "n7", short: "You are my favorite weather.", full: "Every kind. Sunny you, rainy you, thunderstorm you. I'd stand outside in any of it.", color: "yellow" },
  { id: "n8", short: "Come back to bed.", full: "It's cold without you. The blanket knows. I know. Come back, slowly. Bring your sleepy voice.", color: "pink" },
  { id: "n9", short: "You're my safe place.", full: "Of all the places I've ever lived, you're the only one that ever felt like home on the first day.", color: "mint" },
];

export interface FutureLetter {
  id: string;
  title: string;
  subtitle: string;
  body: string;
}

export const futureLetters: FutureLetter[] = [
  {
    id: "sad",
    title: "Open when you're sad",
    subtitle: "for the heavy days",
    body: "Hi. I'm so sorry today is hard. You don't have to explain. You don't have to fix it. Just sit with me for a minute. You are loved exactly as you are right now — messy hair, tired eyes, all of it. Drink some water. Eat the snack. Come back to me when you can. I'm not going anywhere.",
  },
  {
    id: "missing",
    title: "Open when you miss me",
    subtitle: "for the in-between",
    body: "I miss you too. Probably more. Close your eyes and think of the last time I made you laugh — that's where I am right now, just on the other side of the day. I'll be back. I always come back to you.",
  },
  {
    id: "year",
    title: "Open one year from now",
    subtitle: "for future us",
    body: "Hi from past me. I hope this year was kind. I hope you grew, and rested, and laughed loud enough to scare yourself. I hope we're still us — softer, maybe. Funnier, probably. I'm certain of one thing: I'm still choosing you.",
  },
  {
    id: "anniv",
    title: "Open on our anniversary",
    subtitle: "for the day that started it all",
    body: "Happy us-day. Whatever number this is, it's not enough yet. Thank you for the most ordinary, magical, real love I've ever known. I'd do it all again — even the hard parts — just to find you the same way.",
  },
];
