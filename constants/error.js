// From Min browser (https://github.com/minbrowser/min/blob/master/pages/error/error.js)

const websiteNotFound = {
  title: "This site can't be reached",
  description: "%s's server IP address could not be found.",
  retryOnReconnect: true
}

const connectionFailError = {
  title: "This site can't be reached"
}

const sslError = {
  title: "Your connection is not private",
  description: "Attackers could be trying to steal your information from %s <br>(ex. passwords, messages, credit cards)."
}

const dnsError = {
  title: "This site can't be reached",
  description: "%s's server DNS address could not be found."
}

const offlineError = {
  title: "Unable to connect to the internet",
  description: "This website cannot be displayed because your computer is not connected to the internet.",
  retryOnReconnect: true
}

const errorCodes = {
  '-21': offlineError,
  '-104': connectionFailError,
  '-105': websiteNotFound,
  '-106': offlineError,
  '-107': sslError,
  '-109': websiteNotFound,
  '-110': sslError,
  '-112': sslError,
  '-113': sslError,
  '-116': sslError,
  '-117': sslError,
  '-200': sslError,
  '-201': sslError,
  '-202': sslError,
  '-203': sslError,
  '-204': sslError,
  '-205': sslError,
  '-206': sslError,
  '-207': sslError,
  '-208': sslError,
  '-210': sslError,
  '-211': sslError,
  '-212': sslError,
  '-213': sslError,
  '-300': connectionFailError,
  '-501': sslError,
  '-800': dnsError,
  '-801': dnsError,
  '-802': dnsError,
  '-803': dnsError,
  '-804': dnsError,
  '-805': dnsError,
  '-806': dnsError
}
