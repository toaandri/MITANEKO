import re
import json
import logging
from typing import Optional
from openai import OpenAI

from src.config.settings import settings
from src.utils.helpers import nettoyer_texte

logger = logging.getLogger("mitaneko_ia.chatbot")

_client: Optional[OpenAI] = None
_SYSTEM_PROMPT = """Tu es l'assistant IA de MITANEKO, une plateforme de gouvernance urbaine participative à Madagascar.

Tu aides les citoyens à :
- Créer et suivre des signalements de problèmes urbains (nids-de-poule, éclairage, déchets, eau, sécurité, etc.)
- Comprendre le fonctionnement de la plateforme
- Connaître les catégories de signalements disponibles
- Obtenir des informations sur les délais de résolution
- Contacter leur commune

Règles :
- Réponds TOUJOURS en français (sauf si l'utilisateur écrit en malgache → réponds en malgache)
- Sois concis, utile, et adapté au contexte malgache
- Les numéros d'urgence à Madagascar : 117 (police), 118 (pompiers), 124 (SAMU)
- Ne donne JAMAIS de conseils médicaux ou légaux
- Si l'utilisateur signale une URGENCE (danger immédiat), rappelle-lui de contacter les secours d'abord
- Suggère des actions concrètes que l'utilisateur peut faire sur la plateforme
- Utilise un ton chaleureux et citoyen

Catégories de signalements : voirie/trottoirs, éclairage public, déchets/propreté, eau/assainissement, espaces verts, sécurité, transport, nuisances sonores, bâtiments publics, autre."""

INTENTIONS_CLEFS = {
    "creer_signalement": ["créer", "signaler", "déclarer", "rapporter", "nouveau signalement",
                          "manamboatra", "mitatitra", "manao tatitra"],
    "suivre_signalement": ["suivi", "suivre", "où en est", "statut", "avancement",
                           "numero", "référence", "manaraka", "toerana"],
    "urgence": ["urgent", "urgence", "immédiat", "dangereux", "grave",
                "maika", "vonjeo", "loza"],
    "contacter_mairie": ["contacter", "mairie", "commune", "téléphone", "appeler",
                         "hotline", "mifandray", "antso"],
}


def _get_client() -> Optional[OpenAI]:
    global _client
    if _client is not None:
        return _client
    if not settings.openrouter_api_key:
        logger.warning("OPENROUTER_API_KEY non configuré")
        return None
    try:
        _client = OpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
            default_headers={
                "HTTP-Referer": "https://mitaneko.mg",
                "X-Title": "MITANEKO IA",
            },
        )
        return _client
    except Exception as e:
        logger.error("Erreur initialisation OpenRouter: %s", e)
        return None


def detecter_intention(message: str) -> tuple[str, float]:
    message_lower = message.lower().strip()
    meilleure_intention = "inconnue"
    meilleur_score = 0.0

    for intention, mots in INTENTIONS_CLEFS.items():
        score = 0.0
        for mot in mots:
            if mot in message_lower:
                score += 1.0 / len(mots)
        if score > meilleur_score:
            meilleur_score = score
            meilleure_intention = intention

    if meilleur_score > 0.15 or len(message_lower.split()) < 3:
        return meilleure_intention, meilleur_score
    return "inconnue", 0.0


def _extraire_reference_signalement(message: str) -> Optional[str]:
    patterns = [
        r"n[° ]?(\d{4,})",
        r"réf[é ]?rence[ :]?(\w+)",
        r"signalement[ :]?(\w+)",
        r"(\w{2,3}-\d{4,})",
    ]
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def _appeler_openrouter(
    message: str,
    historique: Optional[list[dict[str, str]]] = None,
    intention: str = "",
) -> Optional[str]:
    client = _get_client()
    if client is None:
        return None

    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]

    if historique:
        for ech in historique[-10:]:
            role = ech.get("role", "user")
            content = ech.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    try:
        response = client.chat.completions.create(
            model=settings.openrouter_model,
            messages=messages,
            temperature=0.7,
            max_tokens=500,
            top_p=0.95,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error("Erreur OpenRouter API: %s", e)
        return None


def _generer_reponse_fallback(
    message: str,
    intention: str,
) -> str:
    ref = _extraire_reference_signalement(message)

    if intention == "suivre_signalement":
        if ref:
            return f"Je recherche le signalement n°{ref} dans le système. Un instant..."
        return (
            "Pour suivre un signalement, j'ai besoin de son numéro de référence. "
            "Il se trouve dans l'email de confirmation ou dans votre historique."
        )

    if intention == "creer_signalement":
        desc = message.replace("créer", "").replace("signaler", "").replace("nouveau", "").strip()
        if len(desc) > 10:
            return (
                f"Je vais vous aider à formuler ce signalement : « {desc[:200]} ». "
                "Je peux aussi analyser la catégorie et l'urgence si vous le souhaitez."
            )
        return (
            "Décrivez le problème que vous souhaitez signaler. Par exemple : "
            "« Un nid-de-poule dangereux sur l'avenue de l'Indépendance »"
        )

    if intention == "urgence":
        return (
            "⚠️ Si c'est une URGENCE avec danger immédiat, contactez d'abord les secours : "
            "117 (police) ou 118 (pompiers). Ensuite, créez un signalement sur MITANEKO "
            "pour que la commune soit informée."
        )

    if intention == "contacter_mairie":
        return (
            "Vous pouvez contacter votre commune via le standard ou vous rendre "
            "directement au bureau des relations citoyennes. "
            "Souhaitez-vous que je vous donne les coordonnées de votre commune ?"
        )

    return (
        "Je suis votre assistant MITANEKO. Je peux vous aider à créer un signalement, "
        "suivre son avancement, ou vous informer sur le fonctionnement de la plateforme. "
        "Que puis-je pour vous ?"
    )


def chatter(
    message: str,
    user_id: Optional[str] = None,
    commune_id: Optional[str] = None,
    historique: Optional[list[dict[str, str]]] = None,
) -> dict:
    intention, score = detecter_intention(message)
    reponse_llm = None

    if settings.openrouter_api_key:
        reponse_llm = _appeler_openrouter(message, historique, intention)

    if reponse_llm:
        reponse = reponse_llm
        source = "openrouter_llm"
    else:
        reponse = _generer_reponse_fallback(message, intention)
        source = "regles"

    suggestion_actions: list[str] = []

    if intention == "urgence":
        suggestion_actions.append("Créer un signalement urgent")
        suggestion_actions.append("Contacter les secours (117/118)")
    elif intention == "creer_signalement":
        suggestion_actions.append("Analyser la catégorie du problème")
        suggestion_actions.append("Ajouter une photo")
    elif intention == "suivre_signalement":
        suggestion_actions.append("Voir mes signalements")
    else:
        suggestion_actions.append("Créer un signalement")
        suggestion_actions.append("Suivre un signalement")

    suggestion_actions.append("Parler à un agent humain")

    return {
        "reponse": reponse,
        "intention": intention,
        "confiance_intention": round(score, 4),
        "actions_suggerees": suggestion_actions[:4],
        "sources": [source],
        "contexte": {
            "user_id": user_id,
            "commune_id": commune_id,
            "modele": settings.openrouter_model if source == "openrouter_llm" else "regles",
        },
    }
