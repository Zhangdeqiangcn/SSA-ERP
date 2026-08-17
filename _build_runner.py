import subprocess, os, sys, json

wp = r'C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp'
os.chdir(wp)

npm = os.path.expandvars(r'%ProgramFiles%\nodejs\npm.cmd')

proc = subprocess.Popen(
    [npm, 'run', 'build'],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
)
out, _ = proc.communicate(timeout=180)

report = {'exit': proc.returncode, 'output': out}
with open(os.path.join(wp, 'build_report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(report['exit'])
