
import React from 'react';
import { CollapsibleSection } from '../components/CollapsibleSection';

const DocHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-2xl font-bold text-[var(--text-accent-bright)] mb-4">{children}</h2>
);

const DocSubHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="text-xl font-semibold text-[var(--text-accent)] mt-6 mb-3">{children}</h3>
);

const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
    <pre className="bg-[var(--bg-input)] p-4 rounded-md text-[var(--text-secondary)] whitespace-pre-wrap break-all text-[length:var(--font-size-xs)] font-mono">
        <code>{code.trim()}</code>
    </pre>
);

const Info: React.FC<{children: React.ReactNode}> = ({children}) => (
    <p className="text-[var(--text-primary)] leading-relaxed mb-4">{children}</p>
);

export const FrameworkDoc: React.FC = () => {
    return (
        <div className="p-8 max-w-4xl mx-auto text-[var(--text-primary)]">
            <h1 className="text-4xl font-extrabold text-[var(--text-accent)] mb-2">Phoenix Engine Framework</h1>
            <p className="text-lg text-[var(--text-secondary)] mb-8">A guide to understanding and modifying this world-building tool.</p>

            <CollapsibleSection title="High-Level View: What is This Program?" defaultOpen>
                <Info>
                    The Phoenix Engine is a powerful tool designed for creating and playing narrative-driven games. It's split into two main parts: the <strong>Phoenix Editor</strong> (what you're using now) and the <strong>MegaWatt Game</strong> (the player).
                </Info>
                <DocSubHeader>The Core Concepts</DocSubHeader>
                <ul className="list-disc list-inside space-y-3 mb-4 pl-4">
                    <li><strong>Blueprints (Templates):</strong> Think of a blueprint like a cookie-cutter. It defines the *shape* and *properties* of something. For example, a "Character" blueprint could define that all characters must have a name, a backstory, and a skill level.</li>
                    <li><strong>Entities:</strong> If a blueprint is the cookie-cutter, an entity is the actual cookie. It's a specific instance of a blueprint. "Jax Corrigan" is an entity created from the "Character" blueprint.</li>
                    <li><strong>Scenes (Choices):</strong> These are the individual story moments. A scene presents text to the player, shows an image, and can either lead to the next scene automatically or offer the player a choice between several options.</li>
                    <li><strong>Logic (Conditions & Outcomes):</strong> This is the "if-then" engine of the game.
                        <ul className="list-disc list-inside space-y-2 mt-2 pl-6">
                            <li>A <strong>Condition</strong> is an "if" check. For example, "Show this option *if* the player has the 'Hacking' skill."</li>
                            <li>An <strong>Outcome</strong> is a "then" action. For example, "When the player picks this option, *then* create a new 'Data Log' entity."</li>
                        </ul>
                    </li>
                </ul>
                <DocSubHeader>The Two Halves</DocSubHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--bg-panel)] p-4 rounded-lg">
                        <h4 className="font-bold text-lg">Phoenix Editor</h4>
                        <p className="text-sm text-[var(--text-secondary)]">This is the creative suite where you act as the game designer. You build your world by defining Blueprints, creating Entities, and writing the narrative Scenes that tie everything together.</p>
                    </div>
                     <div className="bg-[var(--bg-panel)] p-4 rounded-lg">
                        <h4 className="font-bold text-lg">MegaWatt Game</h4>
                        <p className="text-sm text-[var(--text-secondary)]">This is the player-facing application. It takes all the data you created in the editor and runs it as an interactive simulation. It shows the scenes, checks the conditions, applies the outcomes, and lets the player experience your world.</p>
                    </div>
                </div>
            </CollapsibleSection>

             <CollapsibleSection title="Mid-Level View: Technical Architecture">
                <Info>This section explains how the different parts of the code fit together to make the engine work.</Info>
                
                <CollapsibleSection title="Data Structure (`types.ts`)">
                    <Info>
                        This is the most critical file for understanding the engine's data. It defines the "shape" of every piece of information using TypeScript interfaces. Everything from a game project to a single choice option is defined here.
                    </Info>
                     <CollapsibleSection title="Code Breakdown: Key Interfaces">
                        <CodeBlock code={`
// The entire project, including launcher settings and all games
export interface PhoenixProject {
  launcherSettings: CompanyLauncherSettings;
  games: GameData[];
}

// A single game project
export interface GameData {
  id: string;
  gameTitle: string;
  startChoiceId: string | null;
  allChoices: PlayerChoice[];
  templates: Template[];
  entities: Entity[];
  // ...and more
}

// A Blueprint for creating entities
export interface Template {
  id: string;
  name: string;
  attributes: AttributeDefinition[];
  isComponent: boolean;
  // ...and more
}

// An instance of a Template
export interface Entity {
  id:string;
  templateId: string;
  name: string;
  attributeValues: { [key: string]: any };
  // ...and more
}

// A story scene
export interface PlayerChoice {
  id: string;
  name: string; // Editor-facing name
  description: string; // Text shown to player
  prompt?: string; // Question for the player
  // ...styles, options, and logic
}
                        `} />
                    </CollapsibleSection>
                </CollapsibleSection>

                 <CollapsibleSection title="The Editor (`PhoenixEditor.tsx`)">
                    <Info>
                        This is the main "container" component for the entire editing experience. It manages the top-level state of your project (all games and launcher settings) and decides which sub-editor to show (Game Editor, Template Editor, etc.).
                    </Info>
                    <CollapsibleSection title="Functionality & Data Flow">
                        <p className="text-sm text-[var(--text-secondary)]">
                            The editor uses a "top-down" data flow. The main `PhoenixEditor` holds the entire `PhoenixProject` state. When you edit a specific game, a copy of that `GameData` is passed down to the `GameEditor`. When you save a change to an entity within that game, the `EntityEditor` calls an `onSave` function, which passes the updated entity up to the `GameEditor`, which in turn passes the updated `GameData` up to the main `PhoenixEditor`. This ensures a single source of truth for all data.
                        </p>
                    </CollapsibleSection>
                    <CollapsibleSection title="Code Breakdown: `PhoenixEditor` Component">
                        <CodeBlock code={`
// Located in: screens/PhoenixEditor.tsx

export const PhoenixEditor: React.FC<PhoenixEditorProps> = ({...}) => {
    // Manages which game is currently being edited.
    const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
    
    // ... many other state variables for modals, UI, etc.

    // This is the function passed down to sub-editors.
    // When called, it updates the main project data.
    const commitGameChange = (updatedGameData: GameData) => {
        const newGames = projectData.games.map(g => g.id === updatedGameData.id ? updatedGameData : g);
        onCommitChange({ ...projectData, games: newGames });
    };

    // If a game is selected, render the GameEditor for it.
    if (selectedGameForEditing) {
        return (
            <GameEditor 
                gameData={selectedGameForEditing}
                onCommitGameChange={commitGameChange}
                // ... other props
            />
        );
    }

    // Otherwise, show the top-level view (Launcher/Games list).
    return (
        // ... JSX for the main editor view
    );
};
                        `} />
                    </CollapsibleSection>
                </CollapsibleSection>
                
                <CollapsibleSection title="The Game Simulation (`SimulationScreen.tsx`)">
                     <Info>
                        This component is the heart of the game player. It manages the current state of the simulated game, displays the `ColonyDashboard` (the main hub), and renders the current `ScenePresenter` when a story moment is triggered.
                    </Info>
                     <CollapsibleSection title="Functionality & Data Flow">
                        <p className="text-sm text-[var(--text-secondary)]">
                           When a simulation starts, a deep copy of the `GameData` from the editor is created. This ensures the player's actions don't modify your original design. The `SimulationScreen` holds this copied game state. When the player makes a choice, the `onChoiceMade` function is called with the outcomes. These outcomes are processed, the game state is updated (e.g., a new entity is created), and the component re-renders with the new state, showing the consequences of the player's actions on the dashboard.
                        </p>
                    </CollapsibleSection>
                    <CollapsibleSection title="Code Breakdown: `SimulationScreen` Component">
                        <CodeBlock code={`
// Located in: screens/SimulationScreen.tsx

export const SimulationScreen: React.FC<SimulationScreenProps> = ({ gameData, onChoiceMade }) => {
  // Keeps track of which story scene is currently active.
  const [activeChoiceId, setActiveChoiceId] = useState<string | null>(null);

  // When a scene is finished, this function is called.
  const handleSceneCompletion = (option?: ChoiceOption) => {
    // If the player picked an option with consequences...
    if (option) {
      // ...process its outcomes.
      onChoiceMade(option.outcomes);
    }
    
    // ... logic to hide the current scene and show the next one.
  };

  return (
    <div>
      {/* The main game hub, shows all entities and available actions */}
      <ColonyDashboard
        gameData={gameData}
        onTriggerChoice={(choiceId) => setActiveChoiceId(choiceId)}
        // ...
      />
      {/* If a scene is active, display it over the dashboard */}
      {activeChoice && (
        <ScenePresenter
          choice={activeChoice}
          gameData={gameData}
          onComplete={handleSceneCompletion}
          // ...
        />
      )}
    </div>
  );
};
                        `} />
                    </CollapsibleSection>
                </CollapsibleSection>

                 <CollapsibleSection title="Logic Engine (`conditionEvaluator.ts`)">
                     <Info>
                       This service is a collection of pure functions responsible for all the game's rule-checking. It takes a `Condition` object and the current `GameData`, and returns `true` or `false`.
                    </Info>
                     <CollapsibleSection title="Functionality & Data Flow">
                        <p className="text-sm text-[var(--text-secondary)]">
                          Whenever the game needs to know if something is true (e.g., "should this choice option be visible?"), it calls `evaluateCondition`. This function looks at the condition's type ('attribute', 'entity_exists', etc.) and runs the appropriate check against the current game state. For example, for an 'attribute' condition, it finds the specified entity, gets the value of its attribute, and compares it to the value defined in the condition.
                        </p>
                    </CollapsibleSection>
                    <CollapsibleSection title="Code Breakdown: `evaluateCondition` function">
                        <CodeBlock code={`
// Located in: services/conditionEvaluator.ts

export function evaluateCondition(condition: Condition, gameData: GameData): boolean {
    switch (condition.type) {
        case 'attribute':
            // Checks if an entity's attribute matches a value (e.g., entity.role == 'Pilot')
            return checkAttributeCondition(condition, gameData);
        case 'entity_exists':
            // Checks if any entity from a specific blueprint exists
            return checkEntityExistsCondition(condition, gameData);
        case 'has_stuff':
            // Checks if an entity's blueprint includes a specific component
            return checkHasStuffCondition(condition, gameData);
        default:
            return false;
    }
}
                        `} />
                    </CollapsibleSection>
                </CollapsibleSection>

            </CollapsibleSection>
        </div>
    );
};
