/**
 * DAG-based Agent Pipeline
 *
 * Executes agent nodes in parallel wherever the dependency graph allows.
 * Each node declares its dependencies by ID. When a node's dependencies
 * are all fulfilled, it runs immediately — no waiting for unrelated work.
 *
 * Pattern: Parallel Fan-out with Dependency Edges
 *
 *   Phase 1 (parallel):  marketData | neighborhood
 *   Phase 2 (sequential): affordability (needs marketData)
 *   Phase 3 (parallel):  risk | propertyAnalysis | rentVsBuy
 *   Phase 4 (parallel):  recommendations | preApproval | investment
 *   Phase 5 (sequential): synthesize (needs everything)
 */

export type AgentStatus = "idle" | "running" | "success" | "failed" | "skipped";

export interface AgentNode<T = unknown> {
  /** Unique identifier for this node */
  id: string;
  /** IDs of nodes that must complete before this one runs */
  dependencies: string[];
  /** The work to perform. Receives a map of dependency results. */
  execute: (results: Map<string, unknown>) => Promise<T>;
  /** Optional gate — if this returns false, the node is skipped */
  condition?: (results: Map<string, unknown>) => boolean;
}

export interface AgentExecution {
  id: string;
  status: AgentStatus;
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
}

export interface PipelineResult {
  results: Map<string, unknown>;
  executions: AgentExecution[];
  totalDurationMs: number;
}

export class Pipeline {
  private nodes: Map<string, AgentNode> = new Map();
  private executions: Map<string, AgentExecution> = new Map();
  private results: Map<string, unknown> = new Map();
  private onNodeComplete?: (execution: AgentExecution) => void;

  /** Register a callback for when each node finishes */
  onProgress(callback: (execution: AgentExecution) => void): this {
    this.onNodeComplete = callback;
    return this;
  }

  /** Add a node to the pipeline */
  addNode<T>(node: AgentNode<T>): this {
    // Validate: no duplicate IDs
    if (this.nodes.has(node.id)) {
      throw new Error(`Duplicate node ID: ${node.id}`);
    }
    this.nodes.set(node.id, node as AgentNode);
    this.executions.set(node.id, { id: node.id, status: "idle" });
    return this;
  }

  /** Run the full pipeline, executing nodes in parallel where possible */
  async run(): Promise<PipelineResult> {
    const t0 = Date.now();

    // Validate all dependencies exist
    for (const [id, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (!this.nodes.has(dep)) {
          throw new Error(`Node "${id}" depends on unknown node "${dep}"`);
        }
      }
    }

    // Detect cycles (simple DFS)
    this.detectCycles();

    // Execute in waves until all nodes are done
    while (this.hasPendingNodes()) {
      const ready = this.getReadyNodes();
      if (ready.length === 0) {
        // All remaining nodes have unmet dependencies (shouldn't happen after cycle check)
        break;
      }

      // Run all ready nodes in parallel
      await Promise.all(ready.map((node) => this.executeNode(node)));
    }

    return {
      results: this.results,
      executions: Array.from(this.executions.values()),
      totalDurationMs: Date.now() - t0,
    };
  }

  /** Get a specific result by node ID, typed */
  getResult<T>(id: string): T | undefined {
    return this.results.get(id) as T | undefined;
  }

  // ── Internal ──

  private hasPendingNodes(): boolean {
    for (const exec of this.executions.values()) {
      if (exec.status === "idle") return true;
    }
    return false;
  }

  private getReadyNodes(): AgentNode[] {
    const ready: AgentNode[] = [];
    for (const [id, node] of this.nodes) {
      const exec = this.executions.get(id)!;
      if (exec.status !== "idle") continue;

      // Check all dependencies are fulfilled (success or skipped)
      const depsReady = node.dependencies.every((dep) => {
        const depExec = this.executions.get(dep)!;
        return depExec.status === "success" || depExec.status === "skipped";
      });

      // Check no dependency failed (if one did, skip this node)
      const depFailed = node.dependencies.some(
        (dep) => this.executions.get(dep)!.status === "failed"
      );

      if (depFailed) {
        this.skipNode(id, "Dependency failed");
        continue;
      }

      if (depsReady) {
        ready.push(node);
      }
    }
    return ready;
  }

  private async executeNode(node: AgentNode): Promise<void> {
    const exec = this.executions.get(node.id)!;

    // Check condition gate
    if (node.condition && !node.condition(this.results)) {
      this.skipNode(node.id, "Condition not met");
      return;
    }

    exec.status = "running";
    exec.startedAt = Date.now();

    try {
      const result = await node.execute(this.results);
      exec.status = "success";
      exec.result = result;
      this.results.set(node.id, result);
    } catch (err) {
      exec.status = "failed";
      exec.error = err instanceof Error ? err.message : String(err);
      console.error(`[pipeline] Node "${node.id}" failed:`, exec.error);
    } finally {
      exec.completedAt = Date.now();
      exec.durationMs = exec.completedAt - exec.startedAt!;
      this.onNodeComplete?.(exec);
    }
  }

  private skipNode(id: string, reason: string): void {
    const exec = this.executions.get(id)!;
    exec.status = "skipped";
    exec.error = reason;
    exec.durationMs = 0;
    this.onNodeComplete?.(exec);
  }

  private detectCycles(): void {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const visit = (id: string): void => {
      if (stack.has(id)) {
        throw new Error(`Cycle detected involving node "${id}"`);
      }
      if (visited.has(id)) return;

      stack.add(id);
      const node = this.nodes.get(id)!;
      for (const dep of node.dependencies) {
        visit(dep);
      }
      stack.delete(id);
      visited.add(id);
    };

    for (const id of this.nodes.keys()) {
      visit(id);
    }
  }
}
