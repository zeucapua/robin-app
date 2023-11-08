import { html } from "hono/html";
import { logs, projects } from "./schema";
import { getDuration } from "./utils";

export const SiteLayout = (props : { children : any }) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://unpkg.com/htmx.org@1.9.3"></script>
      <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
      <script src="https://cdn.twind.style" crossorigin></script>      
      <title>Robin: Lightweight Session Manager</title>
    </head>
    <body class="flex flex-col w-full h-full min-w-screen min-h-screen p-8 bg-neutral-800 text-white">
      ${props.children} 
    </body>
  </html>
`;

export const ProjectCreator = () => {
  return (
    <div class="flex gap-4 p-8 border rounded-xl">
      <input 
        type="text"
        name="new_project"
        placeholder="Enter project name..."
        class="px-4 py-2 rounded-xl text-black"
      />
      <button
        type="button"
        hx-trigger="click"
        hx-post="/createProject"
        hx-include="[name='new_project']"
        hx-target="#punchers"
        hx-swap="beforeend"
        class="px-4 py-2 rounded-xl bg-white text-black"
      >
        Create
      </button>
    </div>
  );
}

export const Puncher = (props: { project: typeof projects.$inferSelect, action : "start" | "end" }) => {
  return (
    <div 
      id={`puncher_${props.project.id}`}
      class={`w-full flex flex-col gap-4 p-8 justify-between items-center border rounded-xl ${props.action === "end" && "bg-neutral-700"}`}
    >
      <div class="flex items-center justify-between gap-2">
        <p class="font-bold text-xl">{props.project.name}</p>
        <button
          type="button"
          hx-trigger="click"
          hx-confirm="Are you sure? These will also delete related sessions."
          hx-delete={`/deleteProject/${props.project.id}`}
          hx-target={`#puncher_${props.project.id}`}
          hx-swap="delete"
          class="w-fit text-sm px-4 py-2 border border-red-600 rounded-xl font-bold text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
        >
          <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M4 8L6.7 8 28 8" _id="63ce595bda5b7d1fa85644ef" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M25.3 8v18.7a2.7 2.7 0 0 1-2.6 2.6H9.3a2.7 2.7 0 0 1-2.6-2.6V8m4 0V5.3a2.7 2.7 0 0 1 2.6-2.6h5.4a2.7 2.7 0 0 1 2.6 2.6v2.7" _id="63ce595bda5b7d1fa85644f0" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M13.3 14.7L13.3 22.7" _id="63ce595bda5b7d1fa85644f1" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M18.7 14.7L18.7 22.7" _id="63ce595bda5b7d1fa85644f2" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><title>Trash</title></svg>
        </button>
      </div>
      <button
        type="button"
        hx-trigger="click"
        hx-patch={`/punch/${props.project.id}`}
        hx-target={`#puncher_${props.project.id}`}
        hx-swap="outerHTML"
        class={`rounded-xl px-4 py-2 w-full h-fit ${props.action === "start" ? "bg-emerald-600" : "bg-red-600"}`}
      >
        {props.action}
      </button>
    </div>
  );
};

export const LogRow = (props: { log: typeof logs.$inferSelect, editing: boolean }) => {
  return (
    <tr id={`log_${props.log.id}`} class="text-center table-row">
      <td class="table-cell py-4">{getDuration(props.log)}</td>
      <td class="table-cell py-4">{props.log.projectId}</td>
      <td class="table-cell py-4">{
        !props.editing ?
          props.log.start?.toLocaleString()
        :
          <input name={`start_${props.log.id}`} type="datetime-local" value={props.log.start} class="bg-neutral-800" />
      }</td>
      <td class="table-cell py-4">{
        !props.editing ?
          props.log.end?.toLocaleString()
        :
          <input name={`end_${props.log.id}`} type="datetime-local" value={props.log.end} class="bg-neutral-800" />
      }</td>
      <td class="flex gap-2 table-cell py-4 text-red-600 px-auto mx-auto items-center justify-center">
        <button
          type="button"
          hx-trigger="click"
          hx-confirm="Are you sure?"
          hx-delete={`/deleteLog/${props.log.id}`}
          hx-target={`#log_${props.log.id}`}
          hx-swap="delete"
          hx-on:click={`htmx.removeClass(htmx.find("#indicator_${props.log.id}"), "hidden")`}
          class="p-auto m-auto"
        >
          <div class="w-full h-full">
            <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M4 8L6.7 8 28 8" _id="63ce595bda5b7d1fa85644ef" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M25.3 8v18.7a2.7 2.7 0 0 1-2.6 2.6H9.3a2.7 2.7 0 0 1-2.6-2.6V8m4 0V5.3a2.7 2.7 0 0 1 2.6-2.6h5.4a2.7 2.7 0 0 1 2.6 2.6v2.7" _id="63ce595bda5b7d1fa85644f0" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M13.3 14.7L13.3 22.7" _id="63ce595bda5b7d1fa85644f1" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><path d="M18.7 14.7L18.7 22.7" _id="63ce595bda5b7d1fa85644f2" _parent="63ce595bda5b7d1fa85644ee" fill="none" stroke-width="2.65625" stroke-linejoin="round" stroke-linecap="round" /><title>Trash</title></svg>
          </div>
          <div id={`indicator_${props.log.id}`} class="hidden htmx-indicator w-8 h-8 animate-spin">
            <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M11.1 9.6a1 1 0 0 1 0 1.4 1 1 0 0 1-1.5 0L6.8 8.2a1 1 0 0 1 1.4-1.4Zm-1.5 11.3l-2.8 2.9a1 1 0 0 0 0 1.4 1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3l2.9-2.8a1 1 0 0 0-1.5-1.5ZM9 16a1 1 0 0 0-1-1H4a1 1 0 0 0 0 2h4a1 1 0 0 0 1-1Zm7-13a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1Zm12 12h-4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2Zm-5.6 6a1 1 0 0 0-1.5 1.4l2.9 2.8a1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3 1 1 0 0 0 0-1.4ZM16 23a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1Z"  /><title>Spinner</title></svg>
          </div>
        </button>
      
        { props.editing ?
          <button
            hx-trigger="click"
            hx-confirm="Confirm edits?"
            hx-patch={`/confirmLogEdit/${props.log.id}`}
            hx-include={`[name='start_${props.log.id}', name='end_${props.log.id}]`}
            hx-target={`#log_${props.log.id}`}
            hx-swap="outerHTML"
            hx-on:click={`htmx.removeClass(htmx.find("#edit_${props.log.id}"), "hidden")`}
          >
            Done 
            <div id={`edit_${props.log.id}`} class="hidden htmx-indicator w-8 h-8 animate-spin">
              <svg viewbox="0 0 32 32" width="16" height="16" stroke="currentColor" fill="currentColor"><path d="M11.1 9.6a1 1 0 0 1 0 1.4 1 1 0 0 1-1.5 0L6.8 8.2a1 1 0 0 1 1.4-1.4Zm-1.5 11.3l-2.8 2.9a1 1 0 0 0 0 1.4 1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3l2.9-2.8a1 1 0 0 0-1.5-1.5ZM9 16a1 1 0 0 0-1-1H4a1 1 0 0 0 0 2h4a1 1 0 0 0 1-1Zm7-13a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1Zm12 12h-4a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2Zm-5.6 6a1 1 0 0 0-1.5 1.4l2.9 2.8a1 1 0 0 0 0.7 0.3 1 1 0 0 0 0.7-0.3 1 1 0 0 0 0-1.4ZM16 23a1 1 0 0 0-1 1v4a1 1 0 0 0 2 0v-4a1 1 0 0 0-1-1Z"  /><title>Spinner</title></svg>
            </div>
          </button>
        :
          <button
            hx-trigger="click"
            hx-patch={`/editLog/${props.log.id}`}
            hx-target={`#log_${props.log.id}`}
            hx-swap="outerHTML"
          >
            Edit
          </button>
        }
      </td>
    </tr>
  );
}
