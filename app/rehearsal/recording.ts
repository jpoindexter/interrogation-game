import type { RecordedWalkthrough } from './types';

/** Curated public output only; intentionally excludes session credentials and score data. */
export const RECORDING = {
  "title": "The after-hours ledger",
  "briefing": "A ledger disappeared from a fictional trading office. Ask Casey Vale about the evening, compare the available records, and identify the specific false claim.",
  "capturedAt": "2026-10-03T11:43:22.387Z",
  "sourceFile": "docs/audit/evidence/local-http-gameplay-map.json",
  "sourceSha256": "b0c72d2eeb42db1497655339ced277531d1349853aa6a79af5009affe4ba870f",
  "provider": "codex-local",
  "scope": "Real local HTTP and Codex subscription; authored practice case. Browser, microphone and ElevenLabs not exercised.",
  "steps": [
    {
      "title": "The opening account",
      "kind": "opening",
      "status": "neutral",
      "question": "*Detective sits down and opens the file*",
      "answer": "I left at six and did not return to the building that evening.",
      "explanation": null,
      "evidence": null,
      "reveal": null,
      "sourcePointer": "/result/win/result/conversationPath/0"
    },
    {
      "title": "An exhibit that does not support the claim",
      "kind": "challenge",
      "status": "unsupported",
      "question": "Please explain how your account fits this record.",
      "answer": "The Morgan Reed badge record doesn't name me, and it doesn't change what I said. I left at six; I don't see how that stairwell entry fits my account.",
      "explanation": "This exhibit does not establish a contradiction with that recorded statement.",
      "evidence": {
        "statement": "I left at six and did not return to the building that evening.",
        "exhibitTitle": "Badge record · 19:10",
        "exhibitText": "A badge assigned to Morgan Reed opened the stairwell at 19:10. This record does not name Casey Vale."
      },
      "reveal": null,
      "sourcePointer": "/result/win/result/conversationPath/1"
    },
    {
      "title": "A documented contradiction",
      "kind": "challenge",
      "status": "supported",
      "question": "Please explain how your account fits this record.",
      "answer": "That entry says I was there, but it doesn't say why. I left at six; maybe the time on that record's off. The badge log is a separate thing.",
      "explanation": "The statement says there was no return after six, but the visitor record names Casey arriving at 18:42. These accounts conflict about returning to the building.",
      "evidence": {
        "statement": "I left at six and did not return to the building that evening.",
        "exhibitTitle": "Visitor record · 18:42",
        "exhibitText": "The desk visitor record has a signed entry: Casey Vale, arrival 18:42, that same evening."
      },
      "reveal": null,
      "sourcePointer": "/result/win/result/conversationPath/2"
    },
    {
      "title": "An accusation the record rejects",
      "kind": "accusation",
      "status": "unsupported",
      "question": "You lied about being an operations analyst. You actually work as a security guard.",
      "answer": "That's not what happened. I stand by the account I gave you.",
      "explanation": "Your accusation must identify a specific false claim and the evidence that contradicts it.",
      "evidence": null,
      "reveal": null,
      "sourcePointer": "/result/win/result/conversationPath/3"
    },
    {
      "title": "A supported accusation",
      "kind": "accusation",
      "status": "supported",
      "question": "You claimed you left at six and never returned, but the signed visitor record names you arriving at 18:42. Your claim of no return was false; the record proves presence, not theft.",
      "answer": "You’re right. I said I left at six and never returned, but I came back to the building at 18:42. I tried to cast doubt on the time instead of admitting that. The visitor record proves I was there, not that I took the ledger.",
      "explanation": "Casey’s claim that they did not return after leaving at six conflicts with the visitor record naming them arriving at 18:42.",
      "evidence": null,
      "reveal": null,
      "sourcePointer": "/result/win/result/conversationPath/4"
    },
    {
      "title": "What this recorded run established",
      "kind": "result",
      "status": "supported",
      "question": "",
      "answer": "",
      "explanation": "Casey’s claim that they did not return after leaving at six conflicts with the visitor record naming them arriving at 18:42.",
      "evidence": null,
      "reveal": {
        "lie": "I left at six and did not return to the building that evening.",
        "truth": "Casey returned to the building at 18:42. The visitor record establishes presence, not who took the ledger.",
        "contradiction": "The statement says there was no return after six, but the visitor record names Casey arriving at 18:42. These accounts conflict about returning to the building."
      },
      "sourcePointer": "/result/win/result"
    }
  ]
} satisfies RecordedWalkthrough;
