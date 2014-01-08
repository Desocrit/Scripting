(function()
{
    var menu;
    var currentElement;
    var e;

    window.oncontextmenu = (function(_e)
    {
        if (_e.toElement.isAnnotation) return false;

        menu.style.display = 'block';
        menu.style.left    = _e.layerX + 'px';
        menu.style.top     = _e.layerY + 'px';
        currentElement     = _e.toElement.id;
        e                  = _e;

        return false;
    });

    var makeAnnotation = (function(x, y, el, text)
    {
        var annotation = document.createElement('div');

        annotation.class = 'annotation_text'
        annotation.style.display    = 'block';
        annotation.style.width      = '300px';
        annotation.style.position   = 'absolute';
        annotation.style.left       = x + 'px';
        annotation.style.top        = y + 'px';
        annotation.style.background = 'rgb(255, 255, 150)';
        annotation.style.border     = '1px solid black';
        annotation.innerText        = text;
        annotation.contentEditable  = true;
        annotation.subjectElement   = document.getElementById(el);
        annotation.isAnnotation     = true;

        menu.style.display = 'none';
        document.body.appendChild(annotation);
        window.parent.annotations.push(annotation);
    });

    var addAnnotation = (function()
    {
        makeAnnotation(e.layerX, e.layerY, currentElement, '');
    });

    menu = document.createElement('div');
    menu.style.display  = 'none';
    menu.style.width    = '300px';
    menu.style.position = 'absolute';

        var a       = document.createElement('a');
        a.onclick   = addAnnotation;
        a.innerText = 'Add Annotation';
        a.style.display = 'block';
        a.style.background = 'red';
        menu.appendChild(a);

    document.body.appendChild(menu);

    window.parent.setCallback(makeAnnotation);
})();