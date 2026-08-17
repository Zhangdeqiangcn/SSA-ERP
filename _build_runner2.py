import ctypes, subprocess, os, json

wp = r'C:\Users\zhangdeqiang\WorkBuddy\2026-05-08-task-1\ssa-erp'
os.chdir(wp)

npm = r'C:\Program Files\nodejs\npm.cmd'

# Try with CREATE_NO_WINDOW flag via ctypes
CREATE_NO_WINDOW = 0x08000000
BYTE = ctypes.c_ubyte
DWORD = ctypes.c_ulong
HANDLE = ctypes.c_void_p
ULONG_PTR = ctypes.POINTER(ctypes.c_ulong)
LPSTR = ctypes.c_char_p
LPWSTR = ctypes.c_wchar_p
LPCSTR = ctypes.c_char_p
LPCWSTR = ctypes.c_wchar_p
DWORD_PTR = ctypes.POINTER(ctypes.c_ulong)
SIZE_T = ctypes.c_ulong

class SECURITY_ATTRIBUTES(ctypes.Structure):
    _fields_ = [("nLength", DWORD), ("lpSecurityDescriptor", ctypes.c_void_p), ("bInheritHandle", ctypes.c_int)]

class STARTUPINFOA(ctypes.Structure):
    _fields_ = [("cb", DWORD), ("lpReserved", LPSTR), ("lpDesktop", LPSTR), ("lpTitle", LPSTR),
                ("dwX", DWORD), ("dwY", DWORD), ("dwXSize", DWORD), ("dwYSize", DWORD),
                ("dwXCountChars", DWORD), ("dwYCountChars", DWORD), ("dwFillAttribute", DWORD),
                ("dwFlags", DWORD), ("wShowWindow", ctypes.c_ushort), ("cbReserved2", ctypes.c_ushort),
                ("lpReserved2", ctypes.POINTER(BYTE)), ("hStdInput", HANDLE), ("hStdOutput", HANDLE), ("hStdError", HANDLE)]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [("hProcess", HANDLE), ("hThread", HANDLE), ("dwProcessId", DWORD), ("dwThreadId", DWORD)]

si = STARTUPINFOA()
si.cb = ctypes.sizeof(si)
si.dwFlags = 0x00000001  # STARTF_USESTDHANDLES
si.wShowWindow = 0

sa = SECURITY_ATTRIBUTES()
sa.nLength = ctypes.sizeof(sa)
sa.bInheritHandle = True

# Create pipes
r_stdout, w_stdout = ctypes.c_void_p(), ctypes.c_void_p()
r_stderr, w_stderr = ctypes.c_void_p(), ctypes.c_void_p()

ctypes.windll.kernel32.CreatePipe(ctypes.byref(r_stdout), ctypes.byref(w_stdout), ctypes.byref(sa), 0)
ctypes.windll.kernel32.CreatePipe(ctypes.byref(r_stderr), ctypes.byref(w_stderr), ctypes.byref(sa), 0)
ctypes.windll.kernel32.SetHandleInformation(w_stdout, 3, 3)
ctypes.windll.kernel32.SetHandleInformation(w_stderr, 3, 3)

si.hStdOutput = w_stdout
si.hStdError = w_stderr

pi = PROCESS_INFORMATION()

cmd = f'"{npm}" run build'
ret = ctypes.windll.kernel32.CreateProcessW(
    None, cmd, None, None, True, CREATE_NO_WINDOW,
    None, wp, ctypes.byref(si), ctypes.byref(pi)
)

if not ret:
    report = {'exit': -1, 'output': f'CreateProcessW failed, error={ctypes.windll.kernel32.GetLastError()}'}
else:
    ctypes.windll.kernel32.WaitForSingleObject(pi.hProcess, 30000)
    ctypes.windll.kernel32.GetExitCodeProcess(pi.hProcess, ctypes.byref(DWORD()))
    exit_code = 0
    ctypes.windll.kernel32.CloseHandle(pi.hProcess)
    ctypes.windll.kernel32.CloseHandle(pi.hThread)

    # Read output
    buf = ctypes.create_string_buffer(65536)
    bytes_read = DWORD()
    ctypes.windll.kernel32.ReadFile(r_stdout, buf, 65535, ctypes.byref(bytes_read), None)
    output = buf.value.decode('utf-8', errors='replace')
    ctypes.windll.kernel32.ReadFile(r_stderr, buf, 65536, ctypes.byref(bytes_read), None)
    output += buf.value.decode('utf-8', errors='replace')
    report = {'exit': 0, 'output': output}

with open(os.path.join(wp, 'build_report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, ensure_ascii=False, indent=2)
print(report['exit'])
print(report['output'][:3000])
