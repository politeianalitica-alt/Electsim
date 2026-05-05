"""N_Workflows — catálogo y runner de wizards guiados."""

from __future__ import annotations

import streamlit as st

from dashboard.ui.premium_animations import inject_premium_css
from services.workflows.workflow_engine import (
    abandon_workflow,
    complete_workflow,
    get_user_active_runs,
    get_workflow,
    list_workflows,
    start_workflow,
    submit_step,
)


st.set_page_config(page_title="Workflows · ElectSim", layout="wide")
inject_premium_css()

st.markdown(
    """
    <div style="padding:8px 0 16px 0;">
      <h1 style="color:#E2E8F0; margin:0;">Workflows guiados</h1>
      <p style="color:#94A3B8; margin:4px 0 0 0;">
        Asistentes paso a paso para tareas habituales del equipo.
      </p>
    </div>
    """,
    unsafe_allow_html=True,
)

tenant_id = st.session_state.get("tenant_id", "default")
user_id = st.session_state.get("user_id", "anon")

active_runs = get_user_active_runs(user_id)

# ---------------------------------------------------------------------------
# Active runs section
# ---------------------------------------------------------------------------
if active_runs:
    st.markdown("### En curso")
    for run in active_runs:
        wf = get_workflow(run.workflow_id)
        if wf is None:
            continue
        cols = st.columns([4, 2, 2, 2])
        with cols[0]:
            st.markdown(f"**{wf.name}** — paso {run.current_step + 1}/{len(wf.steps)}")
        with cols[1]:
            st.progress((run.current_step) / max(1, len(wf.steps)))
        with cols[2]:
            if st.button("Continuar", key=f"continue_{run.run_id}"):
                st.session_state["active_run_id"] = run.run_id
        with cols[3]:
            if st.button("Abandonar", key=f"abandon_{run.run_id}"):
                abandon_workflow(run.run_id)
                st.rerun()

# ---------------------------------------------------------------------------
# Workflow runner
# ---------------------------------------------------------------------------
active_run_id = st.session_state.get("active_run_id")
if active_run_id:
    from services.workflows.workflow_engine import _RUNS  # type: ignore

    run = _RUNS.get(active_run_id)
    if run and run.status == "in_progress":
        wf = get_workflow(run.workflow_id)
        if wf is not None:
            st.markdown("---")
            st.markdown(f"## {wf.name}")
            st.progress(run.current_step / max(1, len(wf.steps)))
            step = wf.steps[run.current_step]
            st.markdown(f"### Paso {run.current_step + 1}: {step.title}")
            st.caption(step.description)
            st.write(step.instruction)

            value = None
            key = f"step_input_{run.run_id}_{step.id}"
            if step.input_type == "text":
                value = st.text_area("Respuesta", key=key, value=step.default_value or "")
            elif step.input_type == "select":
                value = st.selectbox("Selecciona", step.options, key=key)
            elif step.input_type == "multiselect":
                value = st.multiselect("Selecciona uno o varios", step.options, key=key)
            elif step.input_type == "checkbox":
                value = st.checkbox("Confirmar", key=key, value=bool(step.default_value))
            elif step.input_type == "file":
                value = st.file_uploader("Adjuntar archivo", key=key)
            elif step.input_type == "data_picker":
                value = st.text_input("Identificador del dato", key=key)
            else:
                value = st.text_input("Valor", key=key)

            cols = st.columns([1, 1, 6])
            with cols[0]:
                if run.current_step > 0 and st.button("Atrás", key=f"back_{run.run_id}"):
                    run.current_step -= 1
                    st.rerun()
            with cols[1]:
                if run.current_step < len(wf.steps) - 1:
                    if st.button("Continuar", key=f"next_{run.run_id}", type="primary"):
                        submit_step(run.run_id, {"value": value})
                        st.rerun()
                else:
                    if st.button("Completar", key=f"finish_{run.run_id}", type="primary"):
                        submit_step(run.run_id, {"value": value})
                        complete_workflow(
                            run.run_id,
                            output={"summary": f"Workflow {wf.name} completado", "data": run.step_data},
                        )
                        st.session_state["active_run_id"] = None
                        st.success(f"Workflow {wf.name} completado.")
                        st.rerun()
    elif run and run.status == "completed":
        st.success("Workflow completado.")
        if run.output:
            st.json(run.output)
        if st.button("Cerrar"):
            st.session_state["active_run_id"] = None
            st.rerun()


# ---------------------------------------------------------------------------
# Catalog grid
# ---------------------------------------------------------------------------
st.markdown("---")
st.markdown("### Catálogo")

workflows = list_workflows()
cols_per_row = 4
for i in range(0, len(workflows), cols_per_row):
    cols = st.columns(cols_per_row)
    for j, wf in enumerate(workflows[i : i + cols_per_row]):
        with cols[j]:
            st.markdown(
                f"""
                <div class="premium-card" style="min-height:200px;">
                  <div style="color:#94A3B8; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">
                    {wf.category}
                  </div>
                  <div style="color:#E2E8F0; font-size:16px; font-weight:600; margin:6px 0;">
                    {wf.name}
                  </div>
                  <div style="color:#94A3B8; font-size:13px; min-height:40px;">
                    {wf.description}
                  </div>
                  <div style="color:#00D4FF; font-size:12px; margin-top:8px;">
                    ~{wf.estimated_time_minutes} min · {len(wf.steps)} pasos
                  </div>
                </div>
                """,
                unsafe_allow_html=True,
            )
            if st.button("Iniciar", key=f"start_{wf.id}", use_container_width=True):
                run = start_workflow(wf.id, tenant_id=tenant_id, user_id=user_id)
                st.session_state["active_run_id"] = run.run_id
                st.rerun()
