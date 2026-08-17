// dsh-chat-dots — host half.
// All behavior lives in the browser half (exports "./client"): the dot rail
// reads the session list store and switches sessions through the client
// sessions service. This host half exists so the bundle row resolves in the
// host composition; it contributes nothing at runtime.

export const name = 'dsh-chat-dots'

export const inject = []

export function apply(ctx) {
  // Intentionally empty — see module doc comment.
}
