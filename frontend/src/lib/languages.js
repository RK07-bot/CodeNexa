export const LANGUAGES = [
  { id: "python", label: "Python", monaco: "python" },
  { id: "typescript", label: "TypeScript", monaco: "typescript" },
  { id: "cpp", label: "C++", monaco: "cpp" },
];

// generic starters for now, per-problem templates replace these when the runner is built
export const STARTER_CODE = {
  python: `# read the input with input(), print the answer with print()

`,
  typescript: `const lines = (await new Response(Deno.stdin.readable).text()).trim().split("\\n");

// write your solution here, print the answer with console.log()
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // read the input with cin, print the answer with cout

    return 0;
}
`,
};
