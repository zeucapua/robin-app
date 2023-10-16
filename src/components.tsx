import { html } from "hono/html";

export const SiteLayout = (props : { children : any }) => html`
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://unpkg.com/htmx.org@1.9.3"></script>
    <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <title>Robin: Lightweight Session Manager</title>
  </head>
  <body class="w-full h-full min-w-screen min-h-screen p-8 bg-neutral-800 text-white">
    ${props.children} 
  </body>
</html>
`;


export const Session = (props: { id: number, start: Date | null, end: Date | null, projectName: string}) => {
  return (
    <>
    <p>{props.start?.toLocaleString()}</p>
    { props.end ? <p>{props.end.toLocaleString()}</p>
    : <button 
        type="button" 
        hx-post={`/htmx/session/${props.projectName}`}
        hx-trigger="click"
        hx-swap="outerHTML"
      >
        End
      </button> 
    }
    </>
  );
}
  
