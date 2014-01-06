(function()
{
    var menu;
    var currentElement;
    var e;

    window.oncontextmenu = (function(e)
    {
        menu.style.display = 'block';
        menu.style.left    = e.layerX + 'px';
        menu.style.top     = e.layerY + 'px';
        currentElement     = e.toElement;
        window.e           = e;
    });

    document.onload = (function()
    {
        menu = document.createElement('div');
        menu.style.display  = 'none';
        menu.style.width    = '300px';
        menu.style.position = 'absolute';

            var a       = document.createElement('a');
            a.onclick   = addAnnotation;
            a.innerText = 'Add Annotation MoFo';
            menu.appendChild(a);

        document.appendChild(menu);
    });

    var addAnnotation = (function()
    {
        var annotation = document.createElement('div');

        annotation.style.display   = 'block';
        annotation.style.width     = '300px';
        annotation.style.position  = 'absolute';
        annotation.style.left      = e.layerX + 'px';
        annotation.style.top       = e.layerY + 'px';
        annotation.contentEditable = true;
        annotation.subjectElement  = currentElement;

        document.appendChild(annotation);
        window.parent.annotations.push(annotation);
    });
})();