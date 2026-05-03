export type SessionState =
  | "idle"
  | "step_intro"
  | "awaiting_decision"
  | "generating_code"
  | "executing_code"
  | "building_preview"
  | "explaining"
  | "why_deeper"
  | "step_complete"
  | "session_complete"
  | "error";

export type SessionEvent =
  | { type: "START_STEP" }
  | { type: "USER_DECISION"; payload: string }
  | { type: "CODE_GENERATED"; payload: { files: any[]; explanation: string } }
  | { type: "EXECUTION_COMPLETE"; payload: { success: boolean; output: string } }
  | { type: "PREVIEW_READY"; payload: { url: string } }
  | { type: "EXPLANATION_DONE" }
  | { type: "WHY_REQUESTED" }
  | { type: "WHY_DELIVERED" }
  | { type: "NEXT_STEP" }
  | { type: "SESSION_END" }
  | { type: "ERROR"; payload: string };

export class Orchestrator {
  private state: SessionState = "idle";
  
  constructor(private initialState: SessionState = "idle") {
    this.state = initialState;
  }

  public getState() {
    return this.state;
  }

  public transition(event: SessionEvent): SessionState {
    switch (this.state) {
      case "idle":
        if (event.type === "START_STEP") this.state = "step_intro";
        break;
      case "step_intro":
        if (event.type === "NEXT_STEP") this.state = "awaiting_decision"; // or generating_code depending on step
        else if (event.type === "ERROR") this.state = "error";
        break;
      case "awaiting_decision":
        if (event.type === "USER_DECISION") this.state = "generating_code";
        break;
      case "generating_code":
        if (event.type === "CODE_GENERATED") this.state = "executing_code";
        else if (event.type === "ERROR") this.state = "error";
        break;
      case "executing_code":
        if (event.type === "EXECUTION_COMPLETE") {
          this.state = event.payload.success ? "building_preview" : "generating_code"; // simple retry logic
        }
        break;
      case "building_preview":
        if (event.type === "PREVIEW_READY") this.state = "explaining";
        break;
      case "explaining":
        if (event.type === "EXPLANATION_DONE") this.state = "step_complete";
        else if (event.type === "WHY_REQUESTED") this.state = "why_deeper";
        break;
      case "why_deeper":
        if (event.type === "WHY_DELIVERED") this.state = "explaining"; // return
        break;
      case "step_complete":
        if (event.type === "NEXT_STEP") this.state = "step_intro";
        else if (event.type === "SESSION_END") this.state = "session_complete";
        else if (event.type === "WHY_REQUESTED") this.state = "why_deeper";
        break;
      case "error":
        // Manual intervention or retry
        if (event.type === "START_STEP") this.state = "step_intro";
        break;
    }
    return this.state;
  }
}
