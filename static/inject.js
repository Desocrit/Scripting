(function()
{
    var menu;
    var currentElement;
    var e;

    window.oncontextmenu = (function(_e)
    {
        if (_e.target.isAnnotation) return false;

        menu.style.display = 'block';
        menu.style.left    = _e.layerX + 'px';
        menu.style.top     = _e.layerY + 'px';
        currentElement     = _e.target.id;
        e                  = _e;

        return false;
    });

    var makeAnnotation = (function(x, y, el, text)
    {
         var annotationWrap = document.createElement('div');

        annotationWrap.className = 'annotation_wrap';
      
        annotationWrap.style.left       = x + 'px';
        annotationWrap.style.top        = y + 'px';
        annotationWrap.isAnnotation     = true;
        annotationWrap.subjectElement   = document.getElementById(el);

        var annotationContent = document.createElement('div');
        annotationContent.className = 'annotation_text';
        annotationContent.innerHTML        = "Type here...";
        annotationContent.contentEditable  = true;

        menu.style.display = 'none';
        document.body.appendChild(annotationWrap);
        annotationWrap.appendChild(annotationContent);
        window.parent.annotations.push(annotationWrap);
        
        $(".annotation_wrap").draggable()
          .click(function() {
            $(this).draggable( {disabled: false});
        }).dblclick(function() {
            $(this).draggable({ disabled: true });
        }).resizable();
        $(".annotation_wrap").on("mouseout", function() {
            $(this).draggable( {disabled: false});
        })
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
        a.className = 'context_menu';
        menu.appendChild(a);

    document.body.appendChild(menu);

    window.parent.setCallback(makeAnnotation);
})();