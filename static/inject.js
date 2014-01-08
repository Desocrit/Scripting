(function()
{
    var menu;
    var currentElement;
    var e;

    window.oncontextmenu = (function(_e)
    {
        var el = _e.toElement || _e.target;
        if (el.isAnnotation) return false;

        menu.style.display = 'block';
        menu.style.left    = _e.layerX + 'px';
        menu.style.top     = _e.layerY + 'px';
        currentElement     = el.id;
        e                  = _e;

        return false;
    });

    var makeAnnotation = (function(x, y, el, text, uniqid)
    {
        var annotationWrap = document.createElement('div');

        annotationWrap.className = 'annotation_wrap';
      
        annotationWrap.style.left       = x + 'px';
        annotationWrap.style.top        = y + 'px';
        annotationWrap.isAnnotation     = true;
        annotationWrap.subjectElement   = document.getElementById(el);
        annotationWrap.uniqid           = uniqid;

        var annotationContent = document.createElement('textarea');
        annotationContent.className = 'annotation_text';
        annotationContent.value            = text;
        annotationContent.contentEditable  = true;
        annotationContent.on
        annotationContent.isAnnotation     = true;
        annotationContent.onkeyup          = window.parent.saveAnnotation;
        annotationContent.wrapper          = annotationWrap;
        annotationWrap.contentEl           = annotationContent;


        var closeDiv = document.createElement('div');
        closeDiv.className = 'close';
        closeDiv.uniqid = annotationWrap.uniqid;
        var closeX = document.createElement('span');
        closeX.className = 'closeX';
        closeX.innerHTML = 'x';

        menu.style.display = 'none';
        document.body.appendChild(annotationWrap);
        annotationWrap.appendChild(annotationContent);
        annotationWrap.appendChild(closeDiv);
        closeDiv.appendChild(closeX);

        window.parent.annotations[annotationWrap.uniqid] = annotationWrap;
        
        $(".annotation_wrap").draggable
        (
            stop: (function(e, ui)
            {
                window.parent.saveAnnotation
            })
        )
        .click(function() {
            $(this).draggable( {disabled: true});
        }).dblclick(function() {
            $(this).draggable({ disabled: false });
        }).resizable();
        $(".annotation_wrap").on("mouseout", function() {
            $(this).draggable( {disabled: false});
        })
    });

    var addAnnotation = (function()
    {
        makeAnnotation(e.layerX, e.layerY, currentElement, "Type here...", generateUid());
    });

    $(document).ready(function()
    {
        menu = document.createElement('div');
        menu.style.display  = 'none';
        menu.style.width    = '300px';
        menu.style.position = 'absolute';

            var a       = document.createElement('a');
            a.onclick   = addAnnotation;
            a.innerText = 'Add Annotation';
            a.className = 'context_menu';
            menu.appendChild(a);

        document.body.appendChild(menu);

        window.parent.setCallback(makeAnnotation);
    });
})();

var generateUid = function (separator)
{
    var delim = '';//separator || "-";

    function S4()
    {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
};