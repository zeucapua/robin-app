import { html } from "hono/html";

export const SiteLayout = (props : { children : any }) => html`
<!DOCTYPE html>
<html data-theme="night">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/htmx.org@1.9.3"></script>
    <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
    <link href="https://cdn.jsdelivr.net/npm/daisyui@3.9.3/dist/full.css" rel="stylesheet" type="text/css" />
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Robin: Lightweight Session Manager</title>
  </head>
  <body class="w-full h-full min-w-screen min-h-screen p-8 text-white">
    ${props.children} 
  </body>
</html>
`;

export const Project = (props: { id: number, name: string | null, sessions: Record<string, any>[] }) => {
  return (
    <>
      <p class="text-3xl font-bold">{props.name}</p>
      <table class="table">
        <thead>
          <tr>
            <th></th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody id={`${props.name}_table`}>
          { props.sessions && props.sessions.map((s) => {
            <Session id={s.id} start={s.start} end={s.end} projectName={s.projectName} />
          })}
        </tbody>
        <button 
          type="button" 
          class="btn btn-primary"
          hx-post={`/htmx/session/${props.name}`}
          hx-target={`#${props.name}_table`}
          hx-swap="afterend"
        >
          { props.sessions.length > 0 && props.sessions.at(props.sessions.length - 1)?.end ? 
            "End" : "Start"
          }
        </button>
      </table>
    </>
  );
};

export const Session = (props: { id: number, start: Date | null, end: Date | null, projectName: string }) => {
  return (
    <tr>
      <th>{props.id}</th>
      <td>{props.start?.toLocaleString()}</td>
      <td>{props.end?.toLocaleString() ?? "n/a"}</td>
    </tr>
  );
}
