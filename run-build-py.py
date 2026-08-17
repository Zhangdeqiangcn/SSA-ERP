import os, subprocess, json

os.chdir(r'C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp')

node = r'C:\Program Files\nodejs\node.exe'
npm = r'C:\Program Files\nodejs\npm.cmd'

result = subprocess.run(
    [npm, 'run', 'build'],
    capture_output=True,
    text=True,
    timeout=180,
    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
)

report = {
    'exit_code': result.returncode,
    'stdout': result.stdout[:12000],
    'stderr': result.stderr[:4000]
}

with open('build-result.json', 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)

print('Done. Exit code:', result.returncode)
