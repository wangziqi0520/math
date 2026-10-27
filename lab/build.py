"""把 lab/ 下的源文件拼成单文件页面。
用法: python3 lab/build.py [--test MATHJAX_URL] [--fragment OUT]
默认输出仓库根目录的 index.html（完整 HTML 文档）。"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
MATHJAX = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-svg.js'
JS = ['core', 'hero', 'epsdelta', 'heine', 'cauchy', 'practice', 'main']

def page(mathjax=MATHJAX):
    head = (HERE / 'head.html').read_text().replace('__MATHJAX__', mathjax)
    css = (HERE / 'style.css').read_text()
    body = (HERE / 'body.html').read_text()
    js = '\n'.join((HERE / 'js' / f'{n}.js').read_text() for n in JS)
    return head, f'<style>\n{css}</style>', body, f'<script>\n{js}</script>'

def full(mathjax=MATHJAX):
    head, css, body, js = page(mathjax)
    return ('<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'{head}\n{css}\n</head>\n<body>\n{body}\n{js}\n</body>\n</html>\n')

def fragment():
    head, css, body, js = page()
    return f'{head}\n{css}\n{body}\n{js}\n'

if __name__ == '__main__':
    args = sys.argv[1:]
    if args[:1] == ['--test']:
        pathlib.Path(args[2]).write_text(full(args[1]))
    elif args[:1] == ['--fragment']:
        pathlib.Path(args[1]).write_text(fragment())
    else:
        (HERE.parent / 'index.html').write_text(full())
