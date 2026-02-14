import SplittermondActor from "module/actor/actor";
import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { CombatPauseType } from "module/combat";
import type SplittermondCombat from "module/combat/combat";
import type { TokenActionBarCombatActionCategory } from "./templateInterface";

// ── Types ────────────────────────────────────────────────────────────────────

type CombatActionCategory = "bewegung" | "kampf" | "verteidigung" | "gegenstaende" | "sonstiges";

interface CombatActionBase {
    id: string;
    name: string;
    ticks: number;
    actionType: string;
    icon: string;
    page: number;
    description: string;
    category: CombatActionCategory;
}

interface SimpleCombatAction extends CombatActionBase {
    type: "simple";
}
interface MovementCombatAction extends CombatActionBase {
    type: "movement";
    gswMultiplier: number;
}
interface SkillCheckCombatAction extends CombatActionBase {
    type: "skillCheck";
    skill: string;
    difficulty?: string;
}
interface SkillChoiceCombatAction extends CombatActionBase {
    type: "skillChoice";
    skills: string[];
}
interface VariableBonusCombatAction extends CombatActionBase {
    type: "variableBonus";
    bonusPerTicks: number;
    bonusMax: number;
    bonusLabel: string;
    bonusSkills: string[];
}
interface WaitCombatAction extends CombatActionBase {
    type: "wait";
}
interface KeepReadyCombatAction extends CombatActionBase {
    type: "keepReady";
}
interface AtemholenCombatAction extends CombatActionBase {
    type: "atemholen";
}

type CombatAction =
    | SimpleCombatAction
    | MovementCombatAction
    | SkillCheckCombatAction
    | SkillChoiceCombatAction
    | VariableBonusCombatAction
    | WaitCombatAction
    | KeepReadyCombatAction
    | AtemholenCombatAction;

// ── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<CombatActionCategory, string> = {
    bewegung: "Bewegung",
    kampf: "Kampf",
    verteidigung: "Verteidigung",
    gegenstaende: "Gegenstände",
    sonstiges: "Sonstiges",
};

const CATEGORY_ORDER: CombatActionCategory[] = ["bewegung", "kampf", "verteidigung", "gegenstaende", "sonstiges"];

// ── Skill label lookup (German display names) ────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
    acrobatics: "Akrobatik",
    athletics: "Athletik",
};

// ── Action definitions (19 total, GRW pp. 158-167) ───────────────────────────

const COMBAT_ACTIONS: CombatAction[] = [
    // ── Bewegung ──
    {
        id: "freie-bewegung",
        name: "Freie Bewegung",
        ticks: 0,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/wing.svg",
        page: 159,
        category: "bewegung",
        type: "simple",
        description:
            "Bewege dich bis zu 2 Meter als Teil einer sofortigen oder kontinuierlichen Aktion. Kann nicht mit anderen Bewegungshandlungen kombiniert werden. Muss vor der eigentlichen Handlung abgeschlossen werden. Mindestdauer der kombinierten Handlung: 3 Ticks.",
    },
    {
        id: "laufen",
        name: "Laufen",
        ticks: 5,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/wing.svg",
        page: 159,
        category: "bewegung",
        type: "movement",
        gswMultiplier: 1,
        description: "Bewege dich bis zu deiner Geschwindigkeit (GSW) in Metern. Gelegenheitsangriffe möglich.",
    },
    {
        id: "sprinten",
        name: "Sprinten",
        ticks: 10,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/wing.svg",
        page: 160,
        category: "bewegung",
        type: "movement",
        gswMultiplier: 3,
        description:
            "Bewege dich bis zum Dreifachen deiner Geschwindigkeit (GSW) in Metern. Keine Reaktionen möglich während des Sprintens. Angreifer erhalten taktischen Vorteil.",
    },
    {
        id: "kriechen",
        name: "Kriechen",
        ticks: 5,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/wing.svg",
        page: 160,
        category: "bewegung",
        type: "simple",
        description:
            "Bewege dich 1 Meter kriechend. -6 auf eigene Angriffe und gegnerische Fernkampfangriffe. +6 auf gegnerische Nahkampfangriffe.",
    },
    {
        id: "aufstehen-liegend",
        name: "Aufstehen (liegend)",
        ticks: 6,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/up.svg",
        page: 160,
        category: "bewegung",
        type: "simple",
        description: "Stehe aus liegender Position auf. Gelegenheitsangriffe möglich.",
    },
    {
        id: "aufstehen-kniend",
        name: "Aufstehen (kniend/sitzend)",
        ticks: 3,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/up.svg",
        page: 160,
        category: "bewegung",
        type: "simple",
        description: "Stehe aus kniender oder sitzender Position auf. Gelegenheitsangriffe möglich.",
    },
    {
        id: "fallenlassen",
        name: "Fallenlassen",
        ticks: 2,
        actionType: "Sofortige Reaktion",
        icon: "icons/svg/falling.svg",
        page: 160,
        category: "bewegung",
        type: "simple",
        description:
            "Lasse dich zu Boden fallen (liegend). Kann als Reaktion z.B. auf einen angekündigten Fernkampfangriff erfolgen.",
    },

    // ── Kampf ──
    {
        id: "aus-dem-kampf-loesen",
        name: "Aus dem Kampf lösen",
        ticks: 5,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/wing.svg",
        page: 165,
        category: "kampf",
        type: "skillCheck",
        skill: "acrobatics",
        description:
            "Akrobatik-Probe gegen Geistigen Widerstand des Gegners. Bei Erfolg freie Bewegung von bis zu 2 Metern. Kein Gelegenheitsangriff.",
    },
    {
        id: "luecke-suchen",
        name: "Lücke suchen",
        ticks: 2,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/eye.svg",
        page: 161,
        category: "kampf",
        type: "variableBonus",
        bonusPerTicks: 2,
        bonusMax: 3,
        bonusLabel: "Nahkampfangriff",
        bonusSkills: ["melee", "slashing", "chains", "blades", "staffs"],
        description:
            "+1 auf den nächsten Nahkampfangriff gegen diesen Gegner pro 2 Ticks. Bis zu 3× stapelbar (max. +3 für 6 Ticks). Löst keine Gelegenheitsangriffe aus.",
    },
    {
        id: "zielen",
        name: "Zielen",
        ticks: 2,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/target.svg",
        page: 162,
        category: "kampf",
        type: "variableBonus",
        bonusPerTicks: 2,
        bonusMax: 3,
        bonusLabel: "Fernkampfangriff",
        bonusSkills: ["longrange", "throwing"],
        description:
            "+1 auf Fernkampfangriff pro 2 aufgewendete Ticks. Maximal +3 (= 6 Ticks). Gelegenheitsangriffe möglich.",
    },
    {
        id: "koordinieren",
        name: "Koordinieren im Kampf",
        ticks: 10,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/combat.svg",
        page: 166,
        category: "kampf",
        type: "simple",
        description:
            "Anführen-Probe (Schwierigkeit 20 + Anzahl Verbündeter). Bei Erfolg erhalten alle Verbündeten +1 auf Fertigkeitsproben. Gelegenheitsangriffe möglich.",
    },

    // ── Verteidigung ──
    {
        id: "ausweichsprung",
        name: "Ausweichsprung",
        ticks: 3,
        actionType: "Sofortige Reaktion",
        icon: "icons/svg/falling.svg",
        page: 164,
        category: "verteidigung",
        type: "skillCheck",
        skill: "acrobatics",
        difficulty: "15",
        description:
            "Akrobatik-Probe gegen Schwierigkeit 15. Bei Gelingen wird der angerichtete Schaden um 1 Punkt gesenkt (+1 pro EG). Räumliche Position ändert sich nicht.",
    },
    {
        id: "aus-umklammerung-befreien",
        name: "Aus Umklammerung befreien",
        ticks: 5,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/net.svg",
        page: 164,
        category: "verteidigung",
        type: "skillChoice",
        skills: ["athletics", "acrobatics"],
        description:
            "Vergleichende Probe auf Athletik oder Akrobatik gegen die Kampffertigkeit des Haltenden. Bei besserem Ergebnis befreit sich der Kämpfer.",
    },
    {
        id: "umklammerung-loesen",
        name: "Umklammerung lösen",
        ticks: 3,
        actionType: "Sofortige Reaktion",
        icon: "icons/svg/net.svg",
        page: 164,
        category: "verteidigung",
        type: "simple",
        description: "Der Haltende beendet die Umklammerung freiwillig.",
    },

    // ── Gegenstände ──
    {
        id: "gegenstand-verwenden",
        name: "Gegenstand verwenden",
        ticks: 5,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/item-bag.svg",
        page: 162,
        category: "gegenstaende",
        type: "simple",
        description:
            "Waffe ziehen, Gegenstand aufheben, Trank trinken, Tür öffnen o.ä. Gelegenheitsangriffe möglich.",
    },
    {
        id: "gegenstand-fallen-lassen",
        name: "Gegenstand fallen lassen",
        ticks: 0,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/item-bag.svg",
        page: 162,
        category: "gegenstaende",
        type: "simple",
        description: "Einen gehaltenen Gegenstand fallen lassen. Kostet 0 Ticks.",
    },

    // ── Sonstiges ──
    {
        id: "abwarten",
        name: "Abwarten",
        ticks: 0,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/clockwork.svg",
        page: 158,
        category: "sonstiges",
        type: "wait",
        description:
            "Auf das Wartefeld wechseln. Kann jederzeit zum aktuellen Tick zurückkehren (hinten einreihen).",
    },
    {
        id: "aktionen-bereithalten",
        name: "Aktionen bereithalten",
        ticks: 0,
        actionType: "Sofortige Aktion",
        icon: "icons/svg/clockwork.svg",
        page: 158,
        category: "sonstiges",
        type: "keepReady",
        description:
            "Handlung und Auslöser ankündigen. Wechselt auf das Bereitschaftsfeld. Wenn der Auslöser eintritt, wird die Handlung sofort ausgeführt.",
    },
    {
        id: "atemholen",
        name: "Atemholen",
        ticks: 10,
        actionType: "Kontinuierliche Aktion",
        icon: "icons/svg/regen.svg",
        page: 165,
        category: "sonstiges",
        type: "atemholen",
        description:
            "Heilt 10 + Konstitution Punkte Betäubungsschaden. Dauer: 10 + KON Ticks. Kann erst nach einer Verschnaufpause oder Ruhephase erneut eingesetzt werden.",
    },
];

// ── Public API ───────────────────────────────────────────────────────────────

export function getCombatActionsByCategory(): TokenActionBarCombatActionCategory[] {
    return CATEGORY_ORDER.map((cat) => ({
        label: CATEGORY_LABELS[cat],
        actions: COMBAT_ACTIONS.filter((a) => a.category === cat).map((a) => ({
            id: a.id,
            name: a.name,
            ticks: a.ticks,
            icon: a.icon,
            actionType: a.actionType,
        })),
    }));
}

export async function executeCombatAction(actionId: string, actor: SplittermondActor): Promise<void> {
    const action = COMBAT_ACTIONS.find((a) => a.id === actionId);
    if (!action) {
        console.debug(`Splittermond | Unknown combat action: ${actionId}`);
        return;
    }

    switch (action.type) {
        case "simple":
            return handleSimple(action, actor);
        case "movement":
            return handleMovement(action, actor);
        case "skillCheck":
            return handleSkillCheck(action, actor);
        case "skillChoice":
            return handleSkillChoice(action, actor);
        case "variableBonus":
            return handleVariableBonus(action, actor);
        case "wait":
            return handleWait(action, actor);
        case "keepReady":
            return handleKeepReady(action, actor);
        case "atemholen":
            return handleAtemholen(action, actor);
    }
}

// ── Chat message helper ──────────────────────────────────────────────────────

function postCombatActionChat(actor: SplittermondActor, action: CombatActionBase, ticksUsed: number, extraHtml = "") {
    const speaker = foundryApi.getSpeaker({ actor });
    const tickLabel = ticksUsed === 1 ? "1 Tick" : `${ticksUsed} Ticks`;
    foundryApi.createChatMessage({
        speaker,
        content: `<div class="splittermond"><strong>${action.name}</strong> (${tickLabel})<br><em>${action.actionType}</em> (GRW S. ${action.page})<hr>${action.description}${extraHtml}</div>`,
    });
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleSimple(action: SimpleCombatAction, actor: SplittermondActor) {
    if (action.ticks > 0) {
        actor.addTicks(action.ticks, action.name, false);
    }
    postCombatActionChat(actor, action, action.ticks);
}

async function handleMovement(action: MovementCombatAction, actor: SplittermondActor) {
    const gsw = actor.derivedValues?.speed?.value ?? 0;
    const distance = gsw * action.gswMultiplier;
    actor.addTicks(action.ticks, action.name, false);
    const extra = `<br><strong>Bewegung: ${distance} Meter</strong> (GSW ${gsw}${action.gswMultiplier > 1 ? ` × ${action.gswMultiplier}` : ""})`;
    postCombatActionChat(actor, action, action.ticks, extra);
}

async function handleSkillCheck(action: SkillCheckCombatAction, actor: SplittermondActor) {
    if (action.ticks > 0) {
        actor.addTicks(action.ticks, action.name, false);
    }
    postCombatActionChat(actor, action, action.ticks);
    actor.rollSkill(action.skill);
}

async function handleSkillChoice(action: SkillChoiceCombatAction, actor: SplittermondActor) {
    const buttons = action.skills.map((skill) => ({
        action: skill,
        label: SKILL_LABELS[skill] ?? skill,
        default: false,
    }));
    buttons[0].default = true;

    const dialog = new FoundryDialog({
        window: { title: action.name },
        content: `<p>${action.description}</p>`,
        buttons: [
            ...buttons,
            { action: "cancel", label: foundryApi.localize("splittermond.cancel") },
        ],
        submit: async (result) => {
            if (result === "cancel" || !result) return;
            const skill = result as string;
            if (action.ticks > 0) {
                actor.addTicks(action.ticks, action.name, false);
            }
            postCombatActionChat(actor, action, action.ticks);
            actor.rollSkill(skill);
        },
    });
    dialog.render({ force: true });
}

async function handleVariableBonus(action: VariableBonusCombatAction, actor: SplittermondActor) {
    const minTicks = action.bonusPerTicks;
    const maxTicks = action.bonusPerTicks * action.bonusMax;

    const result = await FoundryDialog.prompt({
        classes: ["splittermond"],
        window: { title: action.name },
        content: `<form>
            <div class="form-group">
                <label>Tick-Kosten</label>
                <input type="number" name="ticks" value="${minTicks}" min="${minTicks}" max="${maxTicks}" step="${action.bonusPerTicks}" autofocus>
            </div>
            <p id="bonus-preview" style="text-align:center;font-weight:bold">+1 auf ${action.bonusLabel}</p>
        </form>`,
        render: (_event: Event, dialog: { element: HTMLElement }) => {
            const input = dialog.element.querySelector("[name=ticks]") as HTMLInputElement;
            const preview = dialog.element.querySelector("#bonus-preview") as HTMLElement;
            if (input && preview) {
                input.addEventListener("input", () => {
                    const bonus = Math.min(Math.floor((parseInt(input.value) || 0) / action.bonusPerTicks), action.bonusMax);
                    preview.textContent = `+${bonus} auf ${action.bonusLabel}`;
                });
            }
        },
        ok: {
            label: "Ausführen",
            callback: (_event: Event, button: HTMLButtonElement) => {
                const input = button.form?.elements.namedItem("ticks") as HTMLInputElement | null;
                return parseInt(input?.value ?? "0") || 0;
            },
        },
        rejectClose: true,
    }).catch(() => 0) as number;

    if (!result || result <= 0) return;

    const ticks = result;
    const bonus = Math.min(Math.floor(ticks / action.bonusPerTicks), action.bonusMax);

    actor.addTicks(ticks, action.name, false);

    // Build modifier string from bonus skills
    const modStr = action.bonusSkills.map((s) => `${s} +${bonus}`).join(", ");

    // Remove existing effect with same name
    const old = actor.items.find((i: { type: string; name: string }) => i.type === "statuseffect" && i.name === action.name);
    if (old) {
        await actor.deleteEmbeddedDocuments("Item", [old.id]);
    }

    // Create statuseffect with modifier
    const [effect] = await actor.createEmbeddedDocuments("Item", [
        {
            name: action.name,
            type: "statuseffect",
            img: action.icon,
            system: { modifier: modStr, level: 1 },
        },
    ]);

    // Register one-shot hook to auto-remove after next attack
    const hookId = foundryApi.hooks.on("createChatMessage", async (msg: { type: string; speaker?: { actor?: string } }) => {
        if (msg.type !== "attackRollMessage") return;
        if (msg.speaker?.actor !== actor.id) return;
        foundryApi.hooks.off("createChatMessage", hookId);
        const still = actor.items.get(effect.id);
        if (still) {
            await actor.deleteEmbeddedDocuments("Item", [effect.id]);
        }
    });

    const extra = `<br><strong>+${bonus} auf ${action.bonusLabel}</strong><br><em>Bonus wird nach dem nächsten Angriff automatisch entfernt.</em>`;
    postCombatActionChat(actor, action, ticks, extra);
}

async function handleWait(action: WaitCombatAction, actor: SplittermondActor) {
    const combat = foundryApi.combat as SplittermondCombat | null;
    if (!combat) {
        foundryApi.warnUser("Kein aktiver Kampf.");
        return;
    }
    const combatant = combat.combatants.find((c) => c.actor === actor);
    if (!combatant || combatant.initiative == null) {
        foundryApi.warnUser("Kein Kämpfer im aktiven Kampf gefunden.");
        return;
    }
    await combat.setInitiative(combatant.id, CombatPauseType.wait);
    postCombatActionChat(actor, action, 0);
}

async function handleKeepReady(action: KeepReadyCombatAction, actor: SplittermondActor) {
    const combat = foundryApi.combat as SplittermondCombat | null;
    if (!combat) {
        foundryApi.warnUser("Kein aktiver Kampf.");
        return;
    }
    const combatant = combat.combatants.find((c) => c.actor === actor);
    if (!combatant || combatant.initiative == null) {
        foundryApi.warnUser("Kein Kämpfer im aktiven Kampf gefunden.");
        return;
    }
    await combat.setInitiative(combatant.id, CombatPauseType.keepReady);
    postCombatActionChat(actor, action, 0);
}

async function handleAtemholen(action: AtemholenCombatAction, actor: SplittermondActor) {
    const kon = actor.attributes?.constitution?.value ?? 0;
    const ticks = 10;
    const heal = 10 + kon;

    // Heal stun damage (Betäubungsschaden)
    const currentExhausted = actor.system?.health?.exhausted?.value ?? 0;
    if (currentExhausted > 0) {
        const newExhausted = Math.max(0, currentExhausted - heal);
        await actor.update({ "system.health.exhausted.value": newExhausted });
    }

    actor.addTicks(ticks, action.name, false);

    const extra = `<br><strong>Heilt ${heal} Betäubungsschaden</strong> (10 + KON ${kon})`;
    postCombatActionChat(actor, action, ticks, extra);
}
