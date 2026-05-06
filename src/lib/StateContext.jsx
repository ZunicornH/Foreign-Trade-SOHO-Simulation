import { createContext, useContext, useReducer, useEffect } from 'react';
import { loadState, saveState } from './storage.js';
import { applyScore } from './scoreEngine.js';

const StateContext = createContext(null);
const DispatchContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STAGE': {
      const prev = state.currentStage;
      const next = action.stage;
      const STAGE_ORDER = [1, 2, 34, 5, 6, 7, 8, 9];
      const advancing = STAGE_ORDER.indexOf(next) > STAGE_ORDER.indexOf(prev);
      return {
        ...state,
        currentStage: next,
        completedStage: advancing ? prev : state.completedStage,
        showReview: advancing,
      };
    }
    case 'SET_STAGE34_STEP':
      return { ...state, stage34Step: action.step };
    case 'SET_TRAINING_CASE':
      return { ...state, trainingCase: { ...state.trainingCase, ...action.payload } };
    case 'SET_SUPPLIER':
      return {
        ...state,
        suppliers: state.suppliers.map((s) =>
          s.id === action.id ? { ...s, ...action.payload } : s
        ),
      };
    case 'SELECT_SUPPLIER':
      return { ...state, selectedSupplier: action.id };
    case 'SET_MOQ_CONFIRMED':
      return { ...state, moqConfirmed: action.value };
    case 'SET_PROSPECTING_EMAIL':
      return { ...state, prospectingEmail: action.value };
    case 'SET_PROSPECTING_SUBJECT':
      return { ...state, prospectingSubjectLine: action.value };
    case 'SET_INQUIRY_REPLY':
      return { ...state, inquiryReply: action.value };
    case 'REVEAL_INQUIRY':
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === 'msg_buyer_inquiry' ? { ...m, visible: true } : m
        ),
      };
    case 'SET_QUOTE_DRAFT':
      return { ...state, quoteDraft: { ...state.quoteDraft, ...action.payload } };
    case 'SET_NEGOTIATION':
      return { ...state, negotiation: { ...state.negotiation, ...action.payload } };
    case 'ADD_NEGOTIATION_MESSAGE':
      return {
        ...state,
        negotiation: {
          ...state.negotiation,
          negotiationMessages: [...state.negotiation.negotiationMessages, action.message],
        },
      };
    case 'ADD_ROUND_STRATEGY':
      return {
        ...state,
        negotiation: {
          ...state.negotiation,
          roundStrategies: [...state.negotiation.roundStrategies, action.strategy],
        },
      };
    case 'SET_PI_DRAFT':
      return { ...state, piDraft: { ...state.piDraft, ...action.payload } };
    case 'SET_DEPOSIT_RECEIVED':
      return { ...state, depositReceived: action.value, depositAmount: action.amount ?? state.depositAmount };
    case 'ADD_RISK_FLAG': {
      const exists = state.riskFlags.some((f) => f.id === action.flag.id);
      if (exists) return state;
      return { ...state, riskFlags: [...state.riskFlags, action.flag] };
    }
    case 'REMOVE_RISK_FLAG':
      return { ...state, riskFlags: state.riskFlags.filter((f) => f.id !== action.id) };
    case 'APPLY_SCORE':
      return { ...state, scoreCard: applyScore(state.scoreCard, action.actionKey) };
    case 'DISMISS_REVIEW':
      return { ...state, showReview: false, completedStage: null };

    // v2: PrincipleModal
    case 'SHOW_PRINCIPLE_MODAL':
      return { ...state, activeModal: action.modal };
    case 'DISMISS_PRINCIPLE_MODAL':
      return {
        ...state,
        activeModal: null,
        principleAcks: [...(state.principleAcks || []), { id: action.id, ts: Date.now() }],
      };

    // v2: Quiz answers
    case 'SET_QUIZ_ANSWER':
      return { ...state, quizAnswers: { ...state.quizAnswers, [action.quizId]: action.answer } };

    // v2: Scenario results
    case 'SET_SCENARIO_RESULT':
      return {
        ...state,
        scenarioResults: {
          ...state.scenarioResults,
          [action.scenarioId]: { choice: action.choice, outcome: action.outcome, ts: Date.now() },
        },
      };

    // v2: Briefing acknowledgments
    case 'SET_BRIEFING_DONE':
      return { ...state, briefingsDone: { ...state.briefingsDone, [action.key]: true } };

    // v2: Stage 8
    case 'SET_STAGE8':
      return { ...state, stage8: { ...state.stage8, ...action.payload } };

    // v2: Stage 9
    case 'SET_STAGE9':
      return { ...state, stage9: { ...state.stage9, ...action.payload } };

    case 'RESET':
      return action.state;
    default:
      return state;
  }
}

export function StateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState() {
  return useContext(StateContext);
}

export function useAppDispatch() {
  return useContext(DispatchContext);
}
