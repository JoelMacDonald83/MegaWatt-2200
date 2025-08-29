
export type ConditionOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

export interface AttributeCondition {
  type: 'attribute';
  targetEntityId: string; // ID of the entity to check
  attributeId: string; // Can be a base attribute or a composite component attribute ID
  operator: ConditionOperator;
  value: string | number | null;
}

export interface EntityExistsCondition {
  type: 'entity_exists';
  templateId: string;
  exists: boolean; // true for "exists", false for "does not exist"
}

export interface HasStuffCondition {
    type: 'has_stuff';
    targetEntityId: string;
    stuffItemId: string; // The specific item ID to check for
    hasIt: boolean; // true for "has", false for "does not have"
}

export type Condition = AttributeCondition | EntityExistsCondition | HasStuffCondition;

export interface AttributeDefinition {
  id: string;
  name: string;
  type: 'string' | 'textarea' | 'number' | 'entity_reference';
  // If type is 'entity_reference', this is the ID of the template being referenced.
  referencedTemplateId?: string | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  attributes: AttributeDefinition[];
  parentId?: string;
  isComponent: boolean; // If true, this is a reusable component, not an entity blueprint.
  includedComponentIds?: string[]; // Array of Template IDs where isComponent is true.
}

export interface Entity {
  id:string;
  templateId: string;
  name: string;
  attributeValues: {
    // The key is the AttributeDefinition id for base attributes,
    // or a composite key like `${componentId}_${attributeId}` for component attributes.
    [attributeId: string]: string | number | null;
  };
  imagePrompt?: string;
  imageBase64?: string;
  styles?: {
    borderColor?: string; // e.g., 'cyan-500'
    borderWidth?: 'none' | 'sm' | 'md' | 'lg';
    shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    titleColor?: string; // e.g., 'text-cyan-300'
    backgroundColor?: string; // e.g., 'bg-gray-800/50'
    backgroundOverlayStrength?: 'none' | 'light' | 'medium' | 'heavy';
  }
}

export interface ChoiceOutcomeCreateEntity {
  type: 'create_entity';
  templateId: string;
  name: string;
  attributeValues?: {
    [attributeId: string]: string | number | null;
  };
}

export interface ChoiceOutcomeUpdateEntity {
    type: 'update_entity';
    // Can be a specific entity ID, or '<chosen_entity>' for dynamic choices
    targetEntityId: string;
    attributeId: string;
    // Can be a static value, or '<chosen_entity_id>' for dynamic choices
    value: string | number | null | '<chosen_entity_id>';
}

export type ChoiceOutcome = ChoiceOutcomeCreateEntity | ChoiceOutcomeUpdateEntity;

export interface ChoiceOption {
  id: string;
  text: string;
  outcomes: ChoiceOutcome[];
  nextChoiceId?: string | null;
  conditions?: Condition[];
  sourceEntityId?: string; // For dynamic choices, the entity this option represents
}

export interface PlayerChoice {
  id: string;
  name: string; // Editor-facing name

  // --- Fields from former StoryCard ---
  description: string; // The main text for this scene/node
  imagePrompt: string;
  imageBase64?: string; // Can be from AI gen (raw base64) or upload (data URL)
  foregroundImageBase64?: string; // Will be a data URL from upload

  // Combined styles from StoryCard and original PlayerChoice
  styles?: {
    // text styles
    textPosition?: 'top' | 'middle' | 'bottom';
    textAlign?: 'left' | 'center' | 'right';
    textColor?: string; // e.g. 'text-white'
    fontFamily?: 'sans' | 'serif' | 'mono';
    fontSize?: 'normal' | 'large' | 'xlarge' | 'xxlarge';
    textWidth?: 'narrow' | 'medium' | 'wide';
    textAnimation?: 'none' | 'fade-in' | 'rise-up' | 'typewriter';
    textAnimationDuration?: number;
    textAnimationDelay?: number;

    // background styles
    overlayStrength?: 'none' | 'light' | 'medium' | 'heavy';
    backgroundAnimation?: 'none' | 'kenburns-subtle' | 'kenburns-normal' | 'pan-left' | 'pan-right' | 'zoom-out';
    backgroundAnimationDuration?: number;
    backgroundEffect?: 'none' | 'blur' | 'darken';

    // transition styles
    cardTransition?: 'fade' | 'slide-left' | 'slide-up' | 'zoom-in' | 'dissolve';
    cardTransitionDuration?: number;

    // foreground image styles
    foregroundImageStyles?: {
      position?: 'left' | 'center' | 'right';
      size?: 'small' | 'medium' | 'large';
      animation?: 'none' | 'fade-in' | 'slide-in-left' | 'slide-in-right' | 'zoom-in';
      animationDuration?: number;
      animationDelay?: number;
    };
    
    // styles for the choice options themselves
    choiceLayout?: 'grid' | 'carousel'; // Replaces old `layout`
    promptStyles?: {
      fontSize?: 'normal' | 'large' | 'xlarge' | 'xxlarge';
      textColor?: string; // e.g., 'text-cyan-200'
    }
  };

  // --- Logic Fields ---
  prompt?: string; // Optional prompt. If absent, it's a linear story beat with a "Continue" button.
  choiceType: 'static' | 'dynamic_from_template';
  staticOptions?: ChoiceOption[];
  dynamicConfig?: {
      sourceTemplateId: string;
      optionTemplate: {
          text: string; // Placeholders like {entity.name} will be used here.
      };
      outcomeTemplates: ChoiceOutcome[];
      nextChoiceId?: string | null;
      filterConditions?: Condition[];
  };
  nextChoiceId?: string | null; // If no prompt/options, this is used to continue
}

export interface NewsItem {
  id: string;
  date: string;
  title: string;
  author?: string;
  content: string; // Markdown content
  imagePrompt?: string;
  imageBase64?: string;
  tags?: string[];
  style?: 'normal' | 'urgent' | 'lore';
  status: 'draft' | 'published';
  layout: 'image_top' | 'image_left' | 'image_right';
  cta?: {
    text: string;
    url: string;
  };
}

export interface GameMenuSettings {
  description: string;
  tags: string[];
  backgroundImagePrompt: string;
  backgroundImageBase64?: string;
  news: NewsItem[];
  credits: string;
}

export interface GameData {
  colonyName: string;
  startChoiceId: string | null;
  choices: PlayerChoice[];
  templates: Template[];
  entities: Entity[];
  menuSettings: GameMenuSettings;
}

// --- Editor-specific types ---

export type EditorTheme = 'dark' | 'light' | 'high-contrast';
export type EditorFontSize = 'small' | 'medium' | 'large';

export interface EditorSettings {
  theme: EditorTheme;
  fontSize: EditorFontSize;
}
